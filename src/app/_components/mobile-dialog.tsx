"use client";

import { useEffect, useRef } from "react";
import { X, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { ICONS } from "@/constants/icons";
import type { DialogId } from "@/store/dialog-store";

interface MobileDialogProps {
  title?: string;
  children?: React.ReactNode;
  onBack?: () => void;
  onClose?: () => void;
  isOpen: boolean;
  dialogId: DialogId;
  className?: string;
}

export function MobileDialog({
  title = "Window",
  children,
  onBack,
  onClose,
  isOpen,
  dialogId,
  className,
}: MobileDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Find the icon for the dialog
  const windowIcon = (() => {
    const defaultIcon = "/bg.jpg";
    const allIcons = [ICONS[0], ...ICONS];
    const icon = allIcons.find((icon) => icon?.id === dialogId);
    return icon?.image ?? defaultIcon;
  })();

  // Handle escape key to close dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && onClose) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="mobile-dialog-content animate-fade-in fixed inset-0 z-[50] flex flex-col bg-[#f0f0f0]/95 backdrop-blur-sm md:hidden"
      ref={dialogRef}
    >
      {/* Title bar */}
      <div className="sticky top-0 z-10 flex h-16 items-center justify-between bg-gradient-to-r from-[#000080] via-[#0060B0] to-[#1084d0] px-5 py-2 shadow-md">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center justify-center rounded-full p-1.5 text-white transition-colors hover:bg-white/20"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <div className="relative mr-2 h-8 w-8">
            <Image
              src={windowIcon}
              alt={title}
              fill
              className="object-contain"
            />
          </div>
          <span className="text-base font-bold text-white">{title}</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-full bg-red-500 p-1.5 transition-colors hover:bg-red-600"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          "w-full flex-1 overflow-y-auto p-4 text-black",
          className,
        )}
      >
        <div className="pb-20">{children}</div>
      </div>
    </div>
  );
}
