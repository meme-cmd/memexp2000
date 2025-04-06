"use client";

import * as React from "react";
import { X } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Image from "next/image";
import { ICONS } from "@/constants/icons";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BoxProps {
  title?: string;
  children?: React.ReactNode;
  onBack?: () => void;
  onClose?: () => void;
  isOpen: boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export function Box({
  title = "Window",
  children,
  onBack,
  onClose,
  className,
  isOpen,
  style,
  onClick,
}: BoxProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 100, y: 100 });
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const dragRef = React.useRef({ startX: 0, startY: 0 });

  const windowIcon = React.useMemo(() => {
    const defaultIcon = "/bg.jpg";
    const allIcons = [ICONS[0], ...ICONS];
    const icon = allIcons.find((icon) => icon?.id === title.toUpperCase());
    return icon?.image ?? defaultIcon;
  }, [title]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    if (dialogRef.current) {
      const rect = dialogRef.current.getBoundingClientRect();
      dragRef.current = {
        startX: e.clientX - rect.left,
        startY: e.clientY - rect.top,
      };
    }
  };

  const handleMouseMove = React.useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragRef.current.startX,
          y: e.clientY - dragRef.current.startY,
        });
      }
    },
    [isDragging],
  );

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!isOpen) return null;

  return (
    <div
      ref={dialogRef}
      className={cn(
        "fixed select-none transition-all duration-200",
        isDragging && "scale-[0.98] cursor-grabbing",
        className,
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        ...style,
      }}
      onClick={onClick}
    >
      <div
        className={cn(
          "w-[600px] font-[arial] antialiased",
          "rounded bg-[#c0c0c0] shadow-[inset_-1px_-1px_#0a0a0a,inset_1px_1px_#dfdfdf,inset_-2px_-2px_grey,inset_2px_2px_#fff,inset_3px_3px_10px_rgba(0,0,0,0.2)]",
          "backdrop-blur-[2px] transition-all duration-200",
          "modern-shadow font-chicago",
        )}
      >
        <div
          onMouseDown={handleMouseDown}
          className={cn(
            "flex h-[26px] items-center justify-between px-1",
            "bg-gradient-to-r from-[#000080] to-[#1084d0]",
            "cursor-grab active:cursor-grabbing",
            "modern-transition",
          )}
        >
          <div className="flex items-center gap-1">
            {onBack && (
              <button
                onClick={onBack}
                className="mr-1 h-5 min-w-[20px] rounded bg-[#c0c0c0] px-1.5 text-sm font-medium text-black shadow-[inset_-1px_-1px_#0a0a0a,inset_1px_1px_#fff] transition-colors duration-200 hover:bg-[#dfdfdf] active:shadow-[inset_1px_1px_#0a0a0a,inset_-1px_-1px_#fff]"
              >
                &lt;
              </button>
            )}
            <div className="relative h-4 w-4 overflow-hidden rounded">
              <Image
                src={windowIcon}
                alt="Window Icon"
                width={16}
                height={16}
                className="object-contain mix-blend-screen brightness-200 drop-shadow-[0_0_2px_rgba(0,128,128,0.5)]"
              />
            </div>
            <span className="text-xs font-bold text-white drop-shadow-[1px_1px_#000080]">
              {title}
            </span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="border border-b-[#0a0a0a] border-l-[#dfdfdf] border-r-[#0a0a0a] border-t-[#dfdfdf] bg-[#c0c0c0] px-2 py-0.5 text-[10px] font-bold text-black hover:bg-[#dfdfdf] active:border-b-[#dfdfdf] active:border-l-[#0a0a0a] active:border-r-[#dfdfdf] active:border-t-[#0a0a0a]"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="p-2 [&:has(.overflow-y-auto::-webkit-scrollbar-thumb)]:pr-0">
          <div className="rounded bg-[#a5a5a5] shadow-[inset_1px_1px_#0a0a0a,inset_-1px_-1px_#fff]">
            <div className="max-h-[70vh] overflow-y-auto p-2.5 text-black [scrollbar-color:_#808080_#c0c0c0] [scrollbar-width:_16px] [&::-webkit-scrollbar-thumb]:min-h-[48px] [&::-webkit-scrollbar-thumb]:border-[1px] [&::-webkit-scrollbar-thumb]:border-[#c0c0c0] [&::-webkit-scrollbar-thumb]:bg-[#808080] [&::-webkit-scrollbar-thumb]:shadow-[inset_-1px_-1px_#0a0a0a,inset_1px_1px_#fff] [&::-webkit-scrollbar-track]:bg-[#c0c0c0] [&::-webkit-scrollbar-track]:shadow-[inset_1px_1px_#0a0a0a,inset_-1px_-1px_#fff] [&::-webkit-scrollbar]:w-4">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
