"use client";
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import type { CreateAgentFormData } from "@/types/agent";
import { useUser } from "@/hooks/use-user";
import { agentToast } from "./agent-toast";
import { usePaymentStore } from "@/store/payment-store";
import {
  Connection,
  PublicKey,
  Transaction,
  ComputeBudgetProgram,
  SystemProgram,
} from "@solana/web3.js";
import { useDialogStore } from "@/store/dialog-store";
import { env } from "@/env";

interface CreateAgentFormProps {
  onSuccess?: () => void;
}

declare global {
  interface Window {
    solana?: {
      signTransaction(transaction: Transaction): Promise<Transaction>;
    };
  }
}

const PAYMENT_AMOUNT = 0.1;
const RECIPIENT_ADDRESS = "5HypJG3eMU9dmMzSKCaKunsjpMT6eXuiUGnukmc9ouHz";

export function CreateAgentForm({ onSuccess }: CreateAgentFormProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const { publicKey } = useUser();
  const { isWalletVerified } = usePaymentStore();
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const dialogStore = useDialogStore();

  const [formData, setFormData] = useState<CreateAgentFormData>({
    name: "",
    personality: "",
    background: "",
    expertise: "",
    coreBeliefs: "",
    quirks: "",
    communicationStyle: "",
    isRandom: false,
    conversationTopic: "",
    visibility: "private",
    price: undefined,
    canLaunchToken: false,
  });

  const verifyPayment = api.payment.verifyPayment.useMutation({
    onSuccess: () => {
      agentToast.success("Payment verified successfully!");
      void handleCreateAgent();
    },
    onError: (error) => {
      agentToast.error("Payment verification failed: " + error.message);
      setIsProcessingPayment(false);
    },
  });

  const createAgent = api.ai.createAgent.useMutation({
    onSuccess: async (data) => {
      await utils.r2.listAgents.invalidate();
      await utils.r2.listAgents.refetch();

      agentToast.success(`${data.agent.name} agent deployed successfully!`);

      dialogStore.updateDialogView("AGENTS", {
        id: "AGENTS",
        title: "Agents",
        data: null,
      });

      router.refresh();
      onSuccess?.();
    },
    onError: (error) => {
      agentToast.error("Failed to create agent: " + error.message);
    },
  });

  const handleCreateAgent = async () => {
    try {
      setIsProcessingPayment(true);

      await createAgent.mutateAsync({
        ...formData,
        creator: publicKey!,
      });
    } catch (_error) {
      /* eslint-disable-line @typescript-eslint/no-unused-vars */
      agentToast.error("Failed to create agent");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handlePayment = async () => {
    if (!publicKey || !window.solana) {
      agentToast.walletRequired("Connect wallet to create agents");
      return;
    }

    try {
      setIsProcessingPayment(true);
      const connection = new Connection(env.MAINNET_RPC, {
        commitment: "confirmed",
      });

      const sender = new PublicKey(publicKey);
      const recipient = new PublicKey(RECIPIENT_ADDRESS);
      const lamports = PAYMENT_AMOUNT * 1_000_000_000;

      const transaction = new Transaction();

      transaction.add(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 100000,
        }),
      );

      transaction.add(
        SystemProgram.transfer({
          fromPubkey: sender,
          toPubkey: recipient,
          lamports,
        }),
      );

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = sender;

      let signed;
      try {
        signed = await window.solana.signTransaction(transaction);
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message.includes("rejected") ||
            error.message.includes("User rejected"))
        ) {
          agentToast.info("Transaction was cancelled by user");
        } else {
          agentToast.error("Failed to sign transaction");
        }
        setIsProcessingPayment(false);
        return;
      }

      let signature;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          signature = await connection.sendRawTransaction(signed.serialize(), {
            skipPreflight: false,
          });
          break;
        } catch (error) {
          if (attempt === 2) {
            throw error;
          }
          agentToast.info(`Retrying transaction (attempt ${attempt + 1}/3)...`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      if (!signature) {
        throw new Error("Failed to send transaction after retries");
      }

      agentToast.info("Transaction pending...");

      const confirmationStatus = await connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        "confirmed",
      );

      if (confirmationStatus.value.err) {
        throw new Error(
          `Transaction failed: ${JSON.stringify(confirmationStatus.value.err)}`,
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));

      let txInfo = null;
      for (let i = 0; i < 3; i++) {
        try {
          txInfo = await connection.getTransaction(signature, {
            maxSupportedTransactionVersion: 0,
            commitment: "confirmed",
          });

          if (txInfo?.meta) break;

          if (i < 2) {
            agentToast.info(`Verifying transaction (attempt ${i + 1}/3)...`);
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        } catch (_error) {
          /* eslint-disable-line @typescript-eslint/no-unused-vars */
          if (i < 2) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }
      }

      if (!txInfo?.meta) {
        throw new Error(
          "Transaction verification timeout - please check your wallet for status",
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
      agentToast.info("Verifying payment...");

      await verifyPayment.mutateAsync({
        signature,
        payerPublicKey: publicKey,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("rejected") ||
          error.message.includes("User rejected"))
      ) {
        agentToast.info("Transaction was cancelled by user");
      } else {
        agentToast.error(
          `Payment failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
      setIsProcessingPayment(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey) {
      agentToast.walletRequired("Connect wallet to create agents");
      return;
    }

    if (isWalletVerified(publicKey)) {
      await handleCreateAgent();
    } else {
      await handlePayment();
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleVisibilityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      visibility: e.target.value as "public" | "private",
      price: e.target.value === "private" ? undefined : prev.price,
    }));
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value =
      e.target.value === "" ? undefined : parseFloat(e.target.value);
    setFormData((prev) => ({
      ...prev,
      price: value && !isNaN(value) && value >= 0 ? value : undefined,
    }));
  };

  const getButtonText = () => {
    if (createAgent.isPending) return "Creating...";
    if (isProcessingPayment) return "Processing Payment...";
    if (publicKey && isWalletVerified(publicKey)) return "Create Agent";
    return `Pay ${PAYMENT_AMOUNT} SOL`;
  };

  return (
    <form onSubmit={handleSubmit} className="text-left">
      <div className="flex items-center space-x-2 pb-2">
        <input
          type="checkbox"
          name="isRandom"
          checked={formData.isRandom}
          onChange={handleCheckboxChange}
          className="h-4 w-4 rounded border-gray-300"
        />
        <label className="text-sm">Create Random Agent</label>

        <select
          value={formData.visibility}
          onChange={handleVisibilityChange}
          className="ml-4 rounded border border-gray-300 bg-white p-1 text-sm"
        >
          <option value="private">Private</option>
          <option value="public">Public</option>
        </select>
        <label className="text-sm">Visibility</label>
      </div>

      <div className="flex items-center space-x-2 pb-2">
        <input
          type="checkbox"
          name="canLaunchToken"
          checked={formData.canLaunchToken}
          onChange={handleCheckboxChange}
          className="h-4 w-4 rounded border-gray-300"
        />
        <label className="text-sm">
          Can Launch Tokens after Backroom Discussions
        </label>
        {formData.canLaunchToken && (
          <p className="text-xs text-gray-500">
            Only one agent with token launching capability can be in a backroom
          </p>
        )}
      </div>

      {formData.visibility === "public" && (
        <div className="flex flex-col gap-1 pb-2">
          <label className="block text-sm">Price in SOL (optional)</label>
          <input
            type="number"
            name="price"
            placeholder="Leave empty for free agents"
            value={formData.price === undefined ? "" : formData.price}
            onChange={handlePriceChange}
            min="0"
            step="0.001"
            className="w-full rounded border border-gray-300 bg-white p-1 text-sm"
          />
          <p className="text-xs text-gray-500">
            Users will pay this amount to use your agent in their backrooms
          </p>
        </div>
      )}

      {formData.isRandom ? (
        <div className="flex flex-col gap-1 pb-2">
          <label className="block text-sm">Conversation Topic</label>
          <input
            type="text"
            name="conversationTopic"
            placeholder="General topic for agent creation"
            value={formData.conversationTopic}
            onChange={handleChange}
            className="w-full rounded border border-gray-300 bg-white p-1 text-sm"
            required
          />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1 pb-2">
            <label className="block text-sm">Name</label>
            <input
              type="text"
              name="name"
              placeholder="Agent's name"
              value={formData.name}
              onChange={handleChange}
              className="w-full rounded border border-gray-300 bg-white p-1 text-sm"
              required
            />
          </div>

          <div className="flex flex-col gap-1 py-2">
            <label className="block text-sm">Personality</label>
            <textarea
              name="personality"
              placeholder="Describe the agent's personality"
              value={formData.personality}
              onChange={handleChange}
              className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm"
              rows={3}
              required
            />
          </div>

          <div className="flex flex-col gap-1 py-2">
            <label className="block text-sm">Background</label>
            <textarea
              name="background"
              placeholder="Agent's background and history"
              value={formData.background}
              onChange={handleChange}
              className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm"
              rows={3}
              required
            />
          </div>

          <div className="flex flex-col gap-1 py-2">
            <label className="block text-sm">Expertise</label>
            <input
              type="text"
              name="expertise"
              placeholder="Comma-separated expertise areas"
              value={formData.expertise}
              onChange={handleChange}
              className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm"
              required
            />
          </div>

          <div className="flex flex-col gap-1 py-2">
            <label className="block text-sm">Core Beliefs</label>
            <input
              type="text"
              name="coreBeliefs"
              placeholder="Comma-separated core beliefs"
              value={formData.coreBeliefs}
              onChange={handleChange}
              className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm"
              required
            />
          </div>

          <div className="flex flex-col gap-1 py-2">
            <label className="block text-sm">Quirks</label>
            <input
              type="text"
              name="quirks"
              placeholder="Comma-separated quirks"
              value={formData.quirks}
              onChange={handleChange}
              className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm"
              required
            />
          </div>

          <div className="flex flex-col gap-1 py-2">
            <label className="block text-sm">Communication Style</label>
            <textarea
              name="communicationStyle"
              placeholder="Describe the communication style"
              value={formData.communicationStyle}
              onChange={handleChange}
              className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm"
              rows={3}
              required
            />
          </div>
        </>
      )}

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={createAgent.isPending || isProcessingPayment}
          className="rounded border border-black bg-[#00009e] px-4 py-2 text-sm text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
        >
          {getButtonText()}
        </button>
      </div>
    </form>
  );
}
