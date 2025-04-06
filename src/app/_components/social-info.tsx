"use client";

import React, { useState } from "react";
import { Check, Copy, Twitter } from "lucide-react";
import Link from "next/link";

export function SocialInfo() {
  const [copied, setCopied] = useState(false);
  const contractAddress = "6sLPWn293q3hGMF9mhQAkxnqy2Kz4sQZVW2jQ2Nypump"; // Placeholder contract address

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(contractAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  return (
    <div className="fixed right-4 top-4 z-50 flex flex-col items-end gap-2 rounded bg-[#c0c0c0] p-2 shadow-[inset_-1px_-1px_#0a0a0a,inset_1px_1px_#fff]">
      <div className="flex flex-col items-end gap-1">
        <span className="text-xs font-bold text-black">
          $ZYNC SPL Token CA:
        </span>
        <button
          onClick={copyToClipboard}
          className="group flex items-center gap-1 rounded bg-[#e0e0e0] px-2 py-1 text-xs font-medium text-black shadow-[inset_-1px_-1px_#0a0a0a,inset_1px_1px_#fff] transition-colors hover:bg-[#f0f0f0] active:shadow-[inset_1px_1px_#0a0a0a,inset_-1px_-1px_#fff]"
          title="Click to copy contract address"
        >
          <span className="max-w-[130px] overflow-hidden text-ellipsis sm:max-w-[200px]">
            {contractAddress}
          </span>
          {copied ? (
            <Check className="h-3 w-3 text-green-600" />
          ) : (
            <Copy className="h-3 w-3 opacity-70 group-hover:opacity-100" />
          )}
        </button>
      </div>

      <Link
        href="https://x.com/makewithzync"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 rounded bg-[#e0e0e0] px-2 py-1 text-xs font-medium text-black shadow-[inset_-1px_-1px_#0a0a0a,inset_1px_1px_#fff] transition-colors hover:bg-[#1DA1F2]/10 active:shadow-[inset_1px_1px_#0a0a0a,inset_-1px_-1px_#fff]"
      >
        <Twitter className="h-3 w-3 text-[#1DA1F2]" />
        <span>@makewithzync</span>
      </Link>
    </div>
  );
}
