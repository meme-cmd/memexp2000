import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { storage } from "./r2";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getMint,
  getAccount,
} from "@solana/spl-token";
import { env } from "@/env";

const MINT_ADDRESS = "6sLPWn293q3hGMF9mhQAkxnqy2Kz4sQZVW2jQ2Nypump";
const RECIPIENT_ADDRESS = "5HypJG3eMU9dmMzSKCaKunsjpMT6eXuiUGnukmc9ouHz";
const REQUIRED_PAYMENT_AMOUNT = 10000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

interface PaymentVerification {
  signature: string;
  amount: number;
  timestamp: Date;
  verified: boolean;
}

interface TransactionSignatureVerification {
  signature: string;
  payerPublicKey: string;
  timestamp: Date;
  purpose: string;
}

interface StorageError {
  $metadata?: {
    httpStatusCode?: number;
  };
  Code?: string;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const saveWithRetry = async (key: string, data: PaymentVerification) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await storage.saveObject(key.toLowerCase(), data);
      return;
    } catch (error) {
      if (attempt === 2) throw error;
      await delay(500);
    }
  }
};

const checkTransactionSignatureUsed = async (
  signature: string,
  purpose: string,
): Promise<boolean> => {
  try {
    const signaturesKey = `payments/signatures/${signature}.json`;
    try {
      const verification =
        await storage.getObject<TransactionSignatureVerification>(
          signaturesKey,
        );

      if (verification && verification.purpose !== purpose) {
        console.log(
          `Transaction ${signature} was already used for ${verification.purpose}`,
        );
        return true;
      }

      return false;
    } catch (error) {
      const storageError = error as StorageError;
      if (
        storageError.$metadata?.httpStatusCode === 404 ||
        storageError.Code === "NoSuchKey"
      ) {
        return false;
      }
      throw error;
    }
  } catch (error) {
    console.error("Error checking transaction signature:", error);
    return false;
  }
};

const recordTransactionSignatureUsage = async (
  signature: string,
  payerPublicKey: string,
  purpose: string,
): Promise<void> => {
  try {
    const signaturesKey = `payments/signatures/${signature}.json`;
    const verification: TransactionSignatureVerification = {
      signature,
      payerPublicKey,
      timestamp: new Date(),
      purpose,
    };

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await storage.saveObject(signaturesKey.toLowerCase(), verification);
        return;
      } catch (error) {
        if (attempt === MAX_RETRIES - 1) throw error;
        await delay(RETRY_DELAY);
      }
    }
  } catch (error) {
    console.error("Error recording transaction signature usage:", error);
  }
};

export const paymentRouter = createTRPCRouter({
  verifyPayment: publicProcedure
    .input(
      z.object({
        signature: z.string(),
        payerPublicKey: z.string(),
        recipient: z.string().optional(),
        agentId: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const purpose = input.agentId
        ? `paid-agent-${input.agentId}`
        : "agent-creation";

      const isReplay = await checkTransactionSignatureUsed(
        input.signature,
        purpose,
      );
      if (isReplay) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "This transaction has already been used for a different payment",
        });
      }

      const connection = new Connection(env.MAINNET_RPC, {
        commitment: "confirmed",
      });

      let transaction = null;
      let lastError = null;

      for (let i = 0; i < MAX_RETRIES; i++) {
        try {
          transaction = await connection.getTransaction(input.signature, {
            maxSupportedTransactionVersion: 0,
            commitment: "confirmed",
          });

          if (transaction?.meta) break;

          if (i < MAX_RETRIES - 1) {
            await delay(RETRY_DELAY);
          }
        } catch (error) {
          lastError = error as Error;
          if (i < MAX_RETRIES - 1) {
            await delay(RETRY_DELAY);
          }
        }
      }

      if (!transaction?.meta) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            lastError?.message ??
            "Transaction not found or invalid after retries",
        });
      }

      if (input.recipient && input.agentId) {
        try {
          const recipientPubkey = new PublicKey(input.recipient);
          const payerPubkey = new PublicKey(input.payerPublicKey);

          let transferFound = false;
          let transferredLamports = 0;
          const requiredLamports = REQUIRED_PAYMENT_AMOUNT * 1_000_000_000;

          if (transaction.meta && transaction.transaction.message) {
            const instructions =
              "instructions" in transaction.transaction.message
                ? transaction.transaction.message.instructions
                : transaction.transaction.message instanceof Object &&
                    "compiledInstructions" in transaction.transaction.message
                  ? transaction.transaction.message.compiledInstructions
                  : [];

            for (const ix of instructions) {
              let programId = "";
              if ("programId" in ix && ix.programId) {
                if (ix.programId instanceof PublicKey) {
                  programId = ix.programId.toString();
                } else if (typeof ix.programId === "string") {
                  programId = ix.programId;
                } else {
                  try {
                    programId = JSON.stringify(ix.programId);
                  } catch {
                    programId = "";
                  }
                }
              } else if (
                "programIdIndex" in ix &&
                transaction.transaction.message.staticAccountKeys
              ) {
                programId =
                  transaction.transaction.message.staticAccountKeys[
                    ix.programIdIndex
                  ].toString();
              }

              const isSystemProgramTransfer =
                programId === "11111111111111111111111111111111";
              const isTransferInstruction =
                ("data" in ix &&
                  ix.data &&
                  ix.data.length > 0 &&
                  ix.data[0] === 2) ||
                ("data" in ix &&
                  ix.data &&
                  Buffer.isBuffer(ix.data) &&
                  ix.data.length > 0 &&
                  ix.data[0] === 2);

              if (isSystemProgramTransfer && isTransferInstruction) {
                const accounts =
                  "accountKeys" in transaction.transaction.message
                    ? transaction.transaction.message.accountKeys
                    : transaction.transaction.message.staticAccountKeys;

                let fromIndex = 0;
                let toIndex = 0;

                if (
                  "accounts" in ix &&
                  Array.isArray(ix.accounts) &&
                  ix.accounts.length >= 2
                ) {
                  fromIndex = ix.accounts[0];
                  toIndex = ix.accounts[1];
                } else if (
                  "accountKeyIndexes" in ix &&
                  Array.isArray(ix.accountKeyIndexes) &&
                  ix.accountKeyIndexes.length >= 2
                ) {
                  fromIndex = ix.accountKeyIndexes[0];
                  toIndex = ix.accountKeyIndexes[1];
                }

                const fromAccount = accounts[fromIndex];
                const toAccount = accounts[toIndex];

                if (
                  toAccount.toString() === recipientPubkey.toString() &&
                  fromAccount.toString() === payerPubkey.toString()
                ) {
                  if ("data" in ix && ix.data) {
                    try {
                      let amount: bigint;
                      if (Buffer.isBuffer(ix.data)) {
                        amount = BigInt(ix.data.readBigUInt64LE(4));
                      } else if (typeof ix.data === "string") {
                        const buffer = Buffer.from(ix.data, "base64");
                        amount = BigInt(buffer.readBigUInt64LE(4));
                      } else {
                        amount = BigInt(0);
                      }

                      transferredLamports += Number(amount);
                    } catch (e) {
                      console.error("Error parsing transfer amount:", e);
                    }
                  }

                  transferFound = true;
                }
              }
            }
          }

          if (transaction.meta?.postBalances && transaction.meta?.preBalances) {
            const accountKeys =
              "accountKeys" in transaction.transaction.message
                ? transaction.transaction.message.accountKeys
                : transaction.transaction.message.staticAccountKeys;

            let recipientIndex = -1;
            let payerIndex = -1;

            for (let i = 0; i < accountKeys.length; i++) {
              const accountKey = accountKeys[i].toString();
              if (accountKey === recipientPubkey.toString()) {
                recipientIndex = i;
              }
              if (accountKey === payerPubkey.toString()) {
                payerIndex = i;
              }
            }

            if (recipientIndex >= 0 && payerIndex >= 0) {
              const recipientPreLamports =
                transaction.meta.preBalances[recipientIndex];
              const recipientPostLamports =
                transaction.meta.postBalances[recipientIndex];
              const payerPreLamports = transaction.meta.preBalances[payerIndex];
              const payerPostLamports =
                transaction.meta.postBalances[payerIndex];

              const recipientIncrease =
                recipientPostLamports - recipientPreLamports;
              const payerDecrease = payerPreLamports - payerPostLamports;

              if (recipientIncrease > 0) {
                transferredLamports = Math.max(
                  transferredLamports,
                  recipientIncrease,
                );
                transferFound = true;
              }
            }
          }

          if (!transferFound) {
            const explorerLink = `https://explorer.solana.com/tx/${input.signature}?cluster=mainnet`;
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `SOL payment verification failed. Transaction did not include a transfer from ${input.payerPublicKey} to ${input.recipient}. Transaction details: ${explorerLink}`,
            });
          }

          if (transferredLamports < requiredLamports) {
            const explorerLink = `https://explorer.solana.com/tx/${input.signature}?cluster=mainnet`;
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `SOL payment verification failed. Insufficient amount transferred. Required: ${REQUIRED_PAYMENT_AMOUNT} SOL, Transferred: ${transferredLamports / 1_000_000_000} SOL. Transaction details: ${explorerLink}`,
            });
          }
        } catch (e) {
          if (e instanceof TRPCError) throw e;

          console.error("Error during SOL payment verification:", e);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `SOL payment verification failed - check your transaction`,
          });
        }
      } else {
        try {
          const mint = new PublicKey(MINT_ADDRESS);
          const recipient = new PublicKey(RECIPIENT_ADDRESS);
          const payerPubkey = new PublicKey(input.payerPublicKey);
          const recipientTokenAccount = getAssociatedTokenAddressSync(
            mint,
            recipient,
          );
          const payerTokenAccount = getAssociatedTokenAddressSync(
            mint,
            payerPubkey,
          );

          const mintInfo = await getMint(connection, mint);
          const requiredAmount =
            BigInt(REQUIRED_PAYMENT_AMOUNT) * BigInt(10 ** mintInfo.decimals);

          let transferFound = false;
          let payerVerified = false;

          if (
            transaction.meta?.preTokenBalances &&
            transaction.meta?.postTokenBalances
          ) {
            try {
              const preBalance =
                transaction.meta.preTokenBalances.find(
                  (b) =>
                    b.mint === MINT_ADDRESS && b.owner === RECIPIENT_ADDRESS,
                )?.uiTokenAmount.uiAmount ?? 0;

              const postBalance =
                transaction.meta.postTokenBalances.find(
                  (b) =>
                    b.mint === MINT_ADDRESS && b.owner === RECIPIENT_ADDRESS,
                )?.uiTokenAmount.uiAmount ?? 0;

              if (postBalance - preBalance >= REQUIRED_PAYMENT_AMOUNT) {
                transferFound = true;
                console.log(
                  `Verified by balance change: pre=${preBalance}, post=${postBalance}`,
                );
              }

              const payerPreBalance =
                transaction.meta.preTokenBalances.find(
                  (b) =>
                    b.mint === MINT_ADDRESS && b.owner === input.payerPublicKey,
                )?.uiTokenAmount.uiAmount ?? 0;

              const payerPostBalance =
                transaction.meta.postTokenBalances.find(
                  (b) =>
                    b.mint === MINT_ADDRESS && b.owner === input.payerPublicKey,
                )?.uiTokenAmount.uiAmount ?? 0;

              if (
                payerPreBalance - payerPostBalance >=
                REQUIRED_PAYMENT_AMOUNT
              ) {
                payerVerified = true;
                console.log(
                  `Payer verified by balance change: pre=${payerPreBalance}, post=${payerPostBalance}`,
                );
              }
            } catch (e) {
              console.error("Error checking token balances:", e);
            }
          }

          if (
            (!transferFound || !payerVerified) &&
            transaction.meta?.logMessages
          ) {
            const tokenProgramId = TOKEN_PROGRAM_ID.toBase58();
            const recipientAddress = recipientTokenAccount.toBase58();
            const payerAddress = payerTokenAccount.toBase58();

            for (const log of transaction.meta.logMessages) {
              if (
                log.includes(tokenProgramId) &&
                (log.includes("Transfer") || log.includes("transfer")) &&
                log.includes(recipientAddress)
              ) {
                transferFound = true;
                console.log(
                  "Verified by log message - recipient received tokens",
                );
              }

              if (
                log.includes(tokenProgramId) &&
                (log.includes("Transfer") || log.includes("transfer")) &&
                log.includes(payerAddress) &&
                !log.includes(recipientAddress)
              ) {
                payerVerified = true;
                console.log("Verified by log message - payer sent tokens");
              }
            }
          }

          if (
            (!transferFound || !payerVerified) &&
            transaction.meta?.innerInstructions
          ) {
            for (const inner of transaction.meta.innerInstructions) {
              for (const instruction of inner.instructions) {
                if (instruction.programIdIndex === undefined) continue;

                try {
                  const accountKeys =
                    "accountKeys" in transaction.transaction.message
                      ? transaction.transaction.message.accountKeys
                      : transaction.transaction.message.staticAccountKeys;

                  const programId =
                    accountKeys[instruction.programIdIndex].toString();

                  if (programId === TOKEN_PROGRAM_ID.toString()) {
                    try {
                      if ("data" in instruction && instruction.accounts) {
                        const accounts = instruction.accounts.map(
                          (idx) => accountKeys[idx],
                        );

                        if (
                          accounts.some(
                            (acc) =>
                              acc.toString() ===
                              recipientTokenAccount.toString(),
                          )
                        ) {
                          transferFound = true;
                          console.log(
                            "Verified by inner instruction decode - recipient",
                          );
                        }

                        if (
                          accounts.some(
                            (acc) =>
                              acc.toString() === payerTokenAccount.toString(),
                          )
                        ) {
                          payerVerified = true;
                          console.log(
                            "Verified by inner instruction decode - payer",
                          );
                        }
                      }
                    } catch (e) {
                      console.error("Error decoding token transfer:", e);
                    }
                  }
                } catch (e) {
                  console.error("Error checking inner instructions:", e);
                }
              }

              if (transferFound && payerVerified) break;
            }
          }

          if (!transferFound) {
            const explorerLink = `https://explorer.solana.com/tx/${input.signature}?cluster=mainnet`;
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Payment verification failed. Please ensure you sent exactly ${REQUIRED_PAYMENT_AMOUNT.toLocaleString()} ZYNC to ${RECIPIENT_ADDRESS}. Transaction details: ${explorerLink}`,
            });
          }

          if (!payerVerified) {
            const explorerLink = `https://explorer.solana.com/tx/${input.signature}?cluster=mainnet`;
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Payment verification failed. Could not verify that ${input.payerPublicKey} made the payment. Transaction details: ${explorerLink}`,
            });
          }

          try {
            await getAccount(connection, recipientTokenAccount);
          } catch (e) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Recipient token account not found or invalid - payment may not have completed properly`,
            });
          }
        } catch (e) {
          if (e instanceof TRPCError) throw e;

          console.error("Error during token verification:", e);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Payment verification failed - required ${REQUIRED_PAYMENT_AMOUNT.toLocaleString()} ZYNC tokens`,
          });
        }
      }

      let verificationKey: string;

      if (input.agentId) {
        verificationKey = `payments/paid-agents/${input.payerPublicKey.toLowerCase()}/${input.agentId}.json`;
      } else {
        verificationKey = `payments/agent-creation/${input.payerPublicKey.toLowerCase()}.json`;
      }

      const verification: PaymentVerification = {
        signature: input.signature,
        amount: REQUIRED_PAYMENT_AMOUNT,
        timestamp: new Date(),
        verified: true,
      };

      try {
        await saveWithRetry(verificationKey, verification);

        await recordTransactionSignatureUsage(
          input.signature,
          input.payerPublicKey,
          purpose,
        );
      } catch (storageError) {
        console.error(
          "Storage error during payment verification:",
          storageError,
        );
      }

      return { success: true, signature: input.signature };
    }),

  checkPaymentStatus: publicProcedure
    .input(z.object({ publicKey: z.string().min(1) }))
    .query(async ({ input }) => {
      try {
        const verificationKey = `payments/agent-creation/${input.publicKey.toLowerCase()}.json`;
        try {
          const verification =
            await storage.getObject<PaymentVerification>(verificationKey);
          return {
            verified: verification?.verified ?? false,
            signature: verification?.signature ?? null,
          };
        } catch (error) {
          const storageError = error as StorageError;
          if (
            storageError.$metadata?.httpStatusCode === 404 ||
            storageError.Code === "NoSuchKey"
          ) {
            return { verified: false, signature: null };
          }
          throw error;
        }
      } catch (error) {
        const storageError = error as StorageError;
        if (storageError.$metadata?.httpStatusCode !== 404) {
          console.error("Payment status check error:", error);
        }
        return { verified: false, signature: null };
      }
    }),

  checkAgentPayment: publicProcedure
    .input(
      z.object({
        publicKey: z.string().min(1),
        agentId: z.string().min(1),
      }),
    )
    .query(async ({ input }) => {
      try {
        const verificationKey = `payments/paid-agents/${input.publicKey.toLowerCase()}/${input.agentId}.json`;
        try {
          const verification =
            await storage.getObject<PaymentVerification>(verificationKey);
          return {
            paid: verification?.verified ?? false,
            signature: verification?.signature ?? null,
          };
        } catch (error) {
          const storageError = error as StorageError;
          if (
            storageError.$metadata?.httpStatusCode === 404 ||
            storageError.Code === "NoSuchKey"
          ) {
            return { paid: false, signature: null };
          }
          throw error;
        }
      } catch (error) {
        const storageError = error as StorageError;
        if (storageError.$metadata?.httpStatusCode !== 404) {
          console.error("Agent payment status check error:", error);
        }
        return { paid: false, signature: null };
      }
    }),
});
