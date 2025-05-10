import React from "react";
import { useDialogStore } from "@/store/dialog-store";
import Image from "next/image";

type WalletRequiredMessageProps = {
  featureName?: string;
};

export function WalletRequiredMessage({
  featureName = "this feature",
}: WalletRequiredMessageProps) {
  const { handleButtonClick } = useDialogStore();

  const handleConnectClick = () => {
    handleButtonClick("connect-wallet");
  };

  return (
    <div className="my-4 flex flex-col items-center justify-center rounded-md border-2 border-[#fadd6a] bg-[#ffffcc] p-6 text-center shadow-md">
      <div className="mb-4 flex items-center justify-center">
        <Image
          src="/0wallet.png"
          alt="Wallet icon"
          width={32}
          height={32}
          style={{ objectFit: "contain" }}
        />
      </div>

      <h3 className="mb-2 text-xl font-bold text-[#003399]">
        Wallet Connection Required
      </h3>

      <p className="mb-4 text-sm text-[#555555]">
        You need to connect your wallet to access {featureName}.
      </p>

      <button
        onClick={handleConnectClick}
        className="rounded-md border border-[#184517] bg-gradient-to-b from-[#3c8b3d] to-[#277228] px-4 py-2 font-bold text-white hover:from-[#4ca14d] hover:to-[#318632] focus:outline-none"
      >
        Connect Wallet
      </button>
    </div>
  );
}
