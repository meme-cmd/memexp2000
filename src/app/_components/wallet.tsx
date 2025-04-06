"use client";
import {
  UnifiedWalletButton,
  UnifiedWalletProvider,
} from "@jup-ag/wallet-adapter";
import type { Cluster } from "@solana/web3.js";
import { WalletNotification } from "./wallet-notification";

const WALLET_CONFIG = {
  autoConnect: true,
  env: "mainnet-beta" as Cluster,
  metadata: {
    name: "Zync",
    description: "Zync",
    url: "https://zync.vercel.app",
    iconUrls: ["https://zync.vercel.app/favicon.ico"] as string[],
  },
  notificationCallback: WalletNotification,
  theme: "dark" as const,
  lang: "en" as const,
};

export function WalletProvider() {
  return (
    <UnifiedWalletProvider wallets={[]} config={WALLET_CONFIG}>
      <UnifiedWalletButton
        buttonClassName="!bg-[#c0c0c0] border-2 border-black !p-2 !rounded-sm font-chicago"
        currentUserClassName="!bg-[#c0c0c0] border-2 border-black !p-2 !rounded-sm font-chicago"
      />
    </UnifiedWalletProvider>
  );
}
