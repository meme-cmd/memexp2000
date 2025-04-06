"use client"

import dynamic from "next/dynamic"
import { WalletProvider } from "./wallet"

export const ConnectWalletButton = dynamic(
  () => Promise.resolve(WalletProvider),
  { ssr: false }
) 