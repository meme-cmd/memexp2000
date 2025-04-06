"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { useUser } from "@/hooks/use-user";
import { Connection, VersionedTransaction, Keypair } from "@solana/web3.js";
import { agentToast } from "./agent-toast";
import Image from "next/image";
import { env } from "@/env";

type PumpFunOptions = {
  twitter?: string;
  telegram?: string;
  website?: string;
  initialLiquiditySOL?: number;
  slippageBps?: number;
  priorityFee?: number;
};

type LaunchParams = {
  tokenName: string;
  tokenSymbol: string;
  tokenDescription: string;
  imageUrl: string;
  pumpFunOptions: PumpFunOptions;
  decimals: number;
  supply: number;
  backroomId: string;
  imageFile?: File;
};

type TokenLaunchResult = {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  pumpfun: {
    signature: string;
    metadataUri: string;
  };
};

interface MetadataResponse {
  metadataUri: string;
  metadata?: {
    name?: string;
    symbol?: string;
  };
}

export function BackroomChat({ backroomId }: { backroomId: string }) {
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { publicKey } = useUser();

  const backroomQuery = api.r2.getBackroom.useQuery(
    { id: backroomId },
    {
      enabled: !!backroomId,
      refetchInterval: 3000,
    },
  );

  const agentsQuery = api.r2.listAgents.useQuery({
    limit: 100,
    creator: publicKey ?? undefined,
  });

  const utils = api.useUtils();

  const { mutate: generateNext } = api.backroom.generateNextMessage.useMutation(
    {
      onMutate: () => {
        setIsTyping(true);
      },
      onSuccess: async (_data) => {
        setIsTyping(false);
        await utils.r2.getBackroom.invalidate({ id: backroomId });
      },
      onError: (_error) => {
        setIsTyping(false);
        agentToast.error("Failed to generate message");
      },
    },
  );

  const [isTokenLaunching, setIsTokenLaunching] = useState(false);
  const [isTokenLaunched, setIsTokenLaunched] = useState(false);
  const [tokenLaunchResult, setTokenLaunchResult] =
    useState<TokenLaunchResult | null>(null);
  const [tokenLaunchError, setTokenLaunchError] = useState<string | null>(null);
  const [tokenImage, setTokenImage] = useState<File | null>(null);

  const { mutate: launchTokenMutate, isPending: isLaunchingTokenBackend } =
    api.backroom.launchToken.useMutation({
      onSuccess: async (data) => {
        setTokenLaunchError(null);

        try {
          const result = await handleClientTokenLaunch({
            ...data.launchParams,
            imageFile: tokenImage ?? undefined,
          });
          if (result) {
            setTokenLaunchResult(result);
            setIsTokenLaunched(true);
          }
        } catch (error) {
          setTokenLaunchError(
            error instanceof Error ? error.message : "Token launch failed",
          );
        }
      },
      onError: (error) => {
        setTokenLaunchError(error.message);
      },
    });

  const handleClientTokenLaunch = async (params: LaunchParams) => {
    if (!publicKey || !window.solana) {
      agentToast.walletRequired("Connect wallet to launch tokens");
      return null;
    }

    setIsTokenLaunching(true);
    try {
      const mintKeypair = Keypair.generate();

      const connection = new Connection(env.MAINNET_RPC, {
        commitment: "confirmed",
      });

      const formData = new FormData();
      formData.append("name", params.tokenName);
      formData.append("symbol", params.tokenSymbol);
      formData.append("description", params.tokenDescription);

      if (params.imageFile) {
        formData.append("file", params.imageFile);
      } else {
        try {
          const placeholderUrl =
            "https://api.dicebear.com/7.x/identicon/png?seed=" +
            params.tokenSymbol;
          const placeholderResponse = await fetch(placeholderUrl);
          if (placeholderResponse.ok) {
            const blob = await placeholderResponse.blob();
            const placeholderFile = new File([blob], "token-image.png", {
              type: "image/png",
            });
            formData.append("file", placeholderFile);
          } else {
            console.error(
              "Failed to fetch default image:",
              placeholderResponse.status,
            );
          }
        } catch (imageError) {
          console.error("Error fetching default image:", imageError);
        }
      }

      if (params.pumpFunOptions.twitter) {
        formData.append("twitter", params.pumpFunOptions.twitter);
      }
      if (params.pumpFunOptions.telegram) {
        formData.append("telegram", params.pumpFunOptions.telegram);
      }
      if (params.pumpFunOptions.website) {
        formData.append("website", params.pumpFunOptions.website);
      }
      formData.append("showName", "true");

      const metadataResponse = await fetch("/api/pumpfun-proxy", {
        method: "POST",
        body: formData,
      });

      if (!metadataResponse.ok) {
        const errorText = await metadataResponse.text();
        console.error("Pump.fun metadata upload failed:", {
          status: metadataResponse.status,
          statusText: metadataResponse.statusText,
          errorDetails: errorText,
        });

        throw new Error(
          `Failed to upload metadata: ${metadataResponse.statusText}. Details: ${errorText.substring(0, 100)}${errorText.length > 100 ? "..." : ""}`,
        );
      }

      const metadataResponseJSON =
        (await metadataResponse.json()) as MetadataResponse;

      const response = await fetch(`/api/trade-local-proxy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          publicKey: publicKey,
          action: "create",
          tokenMetadata: {
            name: metadataResponseJSON.metadata?.name ?? params.tokenName,
            symbol: metadataResponseJSON.metadata?.symbol ?? params.tokenSymbol,
            uri: metadataResponseJSON.metadataUri ?? "",
          },
          mint: mintKeypair.publicKey.toBase58(),
          denominatedInSol: "true",
          amount: params.pumpFunOptions.initialLiquiditySOL ?? 0.1, // dev buy amount in SOL
          slippage: params.pumpFunOptions.slippageBps ?? 10,
          priorityFee: params.pumpFunOptions.priorityFee ?? 0.0005,
          pool: "pump",
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get transaction: ${response.statusText}`);
      }

      const transactionData = await response.arrayBuffer();
      const tx = VersionedTransaction.deserialize(
        new Uint8Array(new Uint8Array(transactionData)),
      );

      tx.sign([mintKeypair]);

      let signedTx;
      try {
        // @ts-expect-error - Type safety for browser wallet is difficult to enforce since Solana wallet adapter types may not match runtime behavior
        signedTx = await window.solana.signTransaction(tx);
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message.includes("rejected") ||
            error.message.includes("User rejected"))
        ) {
          agentToast.info("Transaction was cancelled by user");
        } else {
          console.error("Token launch error:", error);

          let errorMessage = "Failed to launch token";
          if (error instanceof Error) {
            if (error.message.includes("Failed to upload metadata")) {
              errorMessage = `Metadata upload failed. Try again with a different image.`;
            } else if (error.message.includes("Not enough SOL")) {
              errorMessage = `Not enough SOL in your wallet to complete transaction.`;
            } else {
              errorMessage = `${error.message}`;
            }
          }

          agentToast.error(errorMessage);
        }
        setIsTokenLaunching(false);
        return null;
      }

      const signature = await connection.sendRawTransaction(
        signedTx.serialize(),
      );

      const confirmation = await connection.confirmTransaction(signature);

      if (confirmation.value.err) {
        throw new Error(
          `Transaction failed: ${JSON.stringify(confirmation.value.err)}`,
        );
      }

      const result: TokenLaunchResult = {
        mint: mintKeypair.publicKey.toBase58(),
        name: params.tokenName,
        symbol: params.tokenSymbol,
        description: params.tokenDescription,
        pumpfun: {
          signature,
          metadataUri: metadataResponseJSON.metadataUri ?? "",
        },
      };

      agentToast.success("Token launched successfully!");
      return result;
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("rejected") ||
          error.message.includes("User rejected"))
      ) {
        agentToast.info("Transaction was cancelled by user");
      } else {
        console.error("Token launch error:", error);

        let errorMessage = "Failed to launch token";
        if (error instanceof Error) {
          if (error.message.includes("Failed to upload metadata")) {
            errorMessage = `Metadata upload failed. Try again with a different image.`;
          } else if (error.message.includes("Not enough SOL")) {
            errorMessage = `Not enough SOL in your wallet to complete transaction.`;
          } else {
            errorMessage = `${error.message}`;
          }
        }

        agentToast.error(errorMessage);
      }
      return null;
    } finally {
      setIsTokenLaunching(false);
    }
  };

  const hasTokenLaunchAgent = useCallback(() => {
    if (!backroomQuery.data || !agentsQuery.data?.agents) return false;

    return backroomQuery.data.agents.some((agentId) => {
      const agent = agentsQuery.data.agents.find((a) => a.id === agentId);
      return agent?.canLaunchToken === true;
    });
  }, [backroomQuery.data, agentsQuery.data?.agents]);

  const [conversationStarted, setConversationStarted] = useState(false);
  const [autoScroll] = useState(false);

  useEffect(() => {
    if (
      backroomQuery.data &&
      backroomQuery.data.messages.length === 0 &&
      !isTyping &&
      !conversationStarted
    ) {
      setConversationStarted(true);
      generateNext({ backroomId });
    }
  }, [
    backroomId,
    backroomQuery.data,
    isTyping,
    conversationStarted,
    generateNext,
  ]);

  useEffect(() => {
    if (
      backroomQuery.data &&
      backroomQuery.data.messages.length > 0 &&
      backroomQuery.data.messages.length < backroomQuery.data.messageLimit &&
      backroomQuery.data.status === "active" &&
      !isTyping
    ) {
      const timer = setTimeout(() => {
        generateNext({ backroomId });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [backroomId, backroomQuery.data, isTyping, generateNext]);

  useEffect(() => {
    if (
      backroomQuery.data &&
      backroomQuery.data.status === "completed" &&
      hasTokenLaunchAgent() &&
      !isTokenLaunched &&
      !isLaunchingTokenBackend &&
      !isTokenLaunching &&
      publicKey
    ) {
      const timer = setTimeout(() => {
        launchTokenMutate({ backroomId, walletPublicKey: publicKey });
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [
    backroomQuery.data,
    isTokenLaunched,
    isLaunchingTokenBackend,
    isTokenLaunching,
    backroomId,
    launchTokenMutate,
    publicKey,
    hasTokenLaunchAgent,
  ]);

  useEffect(() => {
    if (
      autoScroll &&
      messagesEndRef.current &&
      backroomQuery.data?.messages.length
    ) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [backroomQuery.data?.messages.length, autoScroll]);

  if (backroomQuery.isLoading || agentsQuery.isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 items-center justify-center">
          <div className="text-center text-black">Loading...</div>
        </div>
      </div>
    );
  }

  if (backroomQuery.error) {
    return (
      <div className="p-4 text-center text-black">
        <div className="rounded bg-red-100 p-2 text-red-500">
          Error loading chat: {backroomQuery.error.message}
        </div>
      </div>
    );
  }

  if (!backroomQuery.data) {
    return (
      <div className="p-4 text-center text-black">
        <div className="rounded bg-red-100 p-2 text-red-500">
          Backroom not found
        </div>
      </div>
    );
  }

  const currentTypingAgent =
    backroomQuery.data.agents[
      backroomQuery.data.messages.length % backroomQuery.data.agents.length
    ];
  const isPending = backroomQuery.data.status === "pending";

  return (
    <div className="flex h-full w-full flex-col">
      <div className="mb-2 flex-1 overflow-y-auto p-2 sm:p-4">
        {backroomQuery.data.messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div
              className={cn(
                "rounded bg-[#c0c0c0] px-4 py-2 text-sm",
                "shadow-[inset_-1px_-1px_#0a0a0a,inset_1px_1px_#fff]",
              )}
            >
              Starting conversation...
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {backroomQuery.data.messages.map((message, index) => {
              const agent = agentsQuery.data?.agents?.find(
                (a) => a.id === message.agentId,
              );
              const metadata = (message.metadata as { latency?: number }) ?? {};
              const latency = metadata.latency ?? 0;
              const isEven = index % 2 === 0;

              return (
                <div
                  key={message.id}
                  className={cn(
                    "mb-3 flex gap-2",
                    isEven ? "flex-row" : "flex-row-reverse",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      "shadow-[inset_1px_1px_#0a0a0a,inset_-1px_-1px_#fff]",
                      isEven ? "bg-[#c0c0c0]" : "bg-[#d8d8d8]",
                    )}
                  >
                    <Bot className="h-4 w-4" />
                  </div>
                  <div
                    className={cn(
                      "animate-fade-in break-words rounded p-2 sm:p-3",
                      "shadow-[inset_1px_1px_#0a0a0a,inset_-1px_-1px_#fff]",
                      isEven
                        ? "max-w-[85%] bg-[#c0c0c0] sm:max-w-[80%]"
                        : "max-w-[85%] bg-[#d8d8d8] sm:max-w-[80%]",
                    )}
                  >
                    <div className="mb-1 text-xs font-semibold">
                      {agent?.name ?? "Private Agent"}
                    </div>
                    <div className="whitespace-pre-wrap text-sm">
                      {message.content}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                      <span>
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {latency > 0 && (
                        <span>• {(latency / 1000).toFixed(1)}s</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {tokenLaunchResult && (
              <div className="mb-3 flex flex-row gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    "shadow-[inset_1px_1px_#0a0a0a,inset_-1px_-1px_#fff]",
                    "bg-[#c0c0c0]",
                  )}
                >
                  <Bot className="h-4 w-4" />
                </div>
                <div
                  className={cn(
                    "animate-fade-in break-words rounded p-2 sm:p-3",
                    "shadow-[inset_1px_1px_#0a0a0a,inset_-1px_-1px_#fff]",
                    "max-w-[85%] bg-purple-100 sm:max-w-[80%]",
                  )}
                >
                  <div className="mb-1 text-xs font-semibold">System</div>
                  <div className="whitespace-pre-wrap text-sm">
                    <p className="mb-1 font-medium">
                      🚀 Token launched successfully on Pump.fun!
                    </p>
                    <p className="mb-0.5">
                      <span className="font-semibold">Name:</span>{" "}
                      {tokenLaunchResult.name}
                    </p>
                    <p className="mb-0.5">
                      <span className="font-semibold">Symbol:</span>{" "}
                      {tokenLaunchResult.symbol}
                    </p>
                    <p className="mb-0.5">
                      <span className="font-semibold">Mint:</span>{" "}
                      {tokenLaunchResult.mint}
                    </p>
                    <p className="mb-0.5">
                      <a
                        href={`https://pump.fun/coin/${tokenLaunchResult.mint}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 underline"
                      >
                        View on Pump.fun
                      </a>
                    </p>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                    <span>
                      {new Date().toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {tokenLaunchError && (
              <div className="mb-3 flex flex-row gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    "shadow-[inset_1px_1px_#0a0a0a,inset_-1px_-1px_#fff]",
                    "bg-[#c0c0c0]",
                  )}
                >
                  <Bot className="h-4 w-4" />
                </div>
                <div
                  className={cn(
                    "animate-fade-in break-words rounded p-2 sm:p-3",
                    "shadow-[inset_1px_1px_#0a0a0a,inset_-1px_-1px_#fff]",
                    "max-w-[85%] bg-red-100 sm:max-w-[80%]",
                  )}
                >
                  <div className="mb-1 text-xs font-semibold">System</div>
                  <div className="whitespace-pre-wrap text-sm">
                    <p className="mb-1 font-medium">❌ Token Launch Failed</p>
                    <p>{tokenLaunchError}</p>
                    {tokenLaunchError.includes("Not enough SOL") && (
                      <p className="mt-1 text-xs">
                        Please add SOL to your wallet on Solana mainnet to
                        continue.
                      </p>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                    <span>
                      {new Date().toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {(isTyping ||
              isPending ||
              (backroomQuery.data?.status === "completed" &&
                hasTokenLaunchAgent() &&
                !isTokenLaunched &&
                !tokenLaunchError &&
                !tokenLaunchResult &&
                (isLaunchingTokenBackend || isTokenLaunching))) && (
              <div
                className={cn(
                  "mb-3 flex gap-2",
                  backroomQuery.data.messages.length % 2 === 0
                    ? "flex-row"
                    : "flex-row-reverse",
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    "shadow-[inset_1px_1px_#0a0a0a,inset_-1px_-1px_#fff]",
                    "bg-[#c0c0c0]",
                  )}
                >
                  <Bot className="h-4 w-4" />
                </div>
                <div
                  className={cn(
                    "animate-fade-in break-words rounded p-2 sm:p-3",
                    "shadow-[inset_1px_1px_#0a0a0a,inset_-1px_-1px_#fff]",
                    "max-w-[85%] bg-[#c0c0c0] sm:max-w-[80%]",
                  )}
                >
                  <div className="mb-1 text-xs font-semibold">
                    {isTyping || isPending
                      ? (agentsQuery.data?.agents?.find(
                          (a) => a.id === currentTypingAgent,
                        )?.name ?? "Loading agent...")
                      : "System"}
                  </div>
                  <div className="flex items-center gap-1">
                    {isTyping || isPending ? (
                      <>
                        <span
                          className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-600"
                          style={{
                            animationDelay: "0ms",
                            animationDuration: "1s",
                          }}
                        />
                        <span
                          className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-600"
                          style={{
                            animationDelay: "200ms",
                            animationDuration: "1s",
                          }}
                        />
                        <span
                          className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-600"
                          style={{
                            animationDelay: "400ms",
                            animationDuration: "1s",
                          }}
                        />
                      </>
                    ) : (
                      <div className="text-sm">
                        {isLaunchingTokenBackend
                          ? "Preparing token launch..."
                          : "Launching token from your wallet on Pump.fun..."}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {backroomQuery.data?.status === "completed" &&
            hasTokenLaunchAgent() &&
            !isTokenLaunched &&
            !isLaunchingTokenBackend &&
            !isTokenLaunching ? (
              <div className="mb-3 flex flex-col gap-3 rounded bg-gradient-to-br from-purple-50 to-purple-100 p-4 shadow-md">
                <div className="text-lg font-semibold text-purple-800">
                  🚀 Ready to Launch Token
                </div>
                <p className="text-sm text-purple-700">
                  Your token will be created on the Solana blockchain and listed
                  on Pump.fun.
                </p>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="token-image"
                      className="text-sm font-medium text-purple-800"
                    >
                      Token Image (Required)
                    </label>
                    <div className="flex items-center gap-3">
                      {tokenImage && (
                        <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-purple-300">
                          <Image
                            src={URL.createObjectURL(tokenImage)}
                            alt="Token preview"
                            className="h-full w-full object-cover"
                            width={64}
                            height={64}
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <input
                          id="token-image"
                          type="file"
                          accept="image/*"
                          className="w-full rounded border border-purple-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              setTokenImage(e.target.files[0]);
                            }
                          }}
                        />
                        <p className="mt-1 text-xs text-purple-600">
                          This image will be your token&apos;s profile picture.
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (!publicKey) {
                        agentToast.walletRequired(
                          "Connect wallet to launch tokens",
                        );
                        return;
                      }
                      if (!tokenImage) {
                        agentToast.error("Please select a token image");
                        return;
                      }
                      launchTokenMutate({
                        backroomId,
                        walletPublicKey: publicKey,
                      });
                    }}
                    className={cn(
                      "mt-2 rounded bg-purple-600 px-4 py-2 text-base font-semibold text-white",
                      "shadow-[inset_1px_1px_#fff,inset_-1px_-1px_#0a0a0a]",
                      "hover:bg-purple-700",
                    )}
                  >
                    Launch Token with 0.01 SOL
                  </button>
                  <p className="text-xs text-purple-600">
                    Note: This requires approximately 0.01 SOL for initial
                    liquidity plus a small transaction fee.
                  </p>
                </div>
              </div>
            ) : null}
            <div ref={messagesEndRef} className="h-px" />
          </div>
        )}
      </div>
    </div>
  );
}
