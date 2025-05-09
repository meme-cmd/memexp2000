import React from 'react';
import { useDialogStore } from "@/store/dialog-store";
import Image from 'next/image';

type WalletRequiredMessageProps = {
  featureName?: string;
};

export function WalletRequiredMessage({ featureName = "this feature" }: WalletRequiredMessageProps) {
  const { handleButtonClick } = useDialogStore();
  
  const handleConnectClick = () => {
    handleButtonClick("connect-wallet");
  };
  
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center bg-[#ffffcc] border-2 border-[#fadd6a] rounded-md shadow-md my-4">
      <div className="flex items-center justify-center mb-4">
        <img src="/0wallet.png" alt="Wallet icon" width={32} height={32} style={{ objectFit: 'contain' }} />
      </div>
      
      <h3 className="text-xl font-bold text-[#003399] mb-2">Wallet Connection Required</h3>
      
      <p className="text-sm text-[#555555] mb-4">
        You need to connect your wallet to access {featureName}.
      </p>
      
      <button
        onClick={handleConnectClick}
        className="px-4 py-2 text-white font-bold bg-gradient-to-b from-[#3c8b3d] to-[#277228] rounded-md border border-[#184517] hover:from-[#4ca14d] hover:to-[#318632] focus:outline-none"
      >
        Connect Wallet
      </button>
    </div>
  );
} 