"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useDialogStore } from "@/store/dialog-store";
import { ICONS } from "@/constants/icons";
import { cn } from "@/lib/utils";
import type { DialogId } from "@/store/dialog-store";

export function MobileDock() {
  const { openDialog, selectIcon, openDialogs } = useDialogStore();
  const [activeDialog, setActiveDialog] = useState<DialogId | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isPressed, setIsPressed] = useState<DialogId | null>(null);

  // Handle dialog opening
  const handleIconClick = (id: DialogId) => {
    selectIcon(id);
    openDialog(id);
  };

  // Update active dialog based on open dialogs
  useEffect(() => {
    if (openDialogs.length > 0) {
      setActiveDialog(openDialogs[openDialogs.length - 1].id);
    } else {
      setActiveDialog(null);
    }
  }, [openDialogs]);

  // Close active dialog when clicking outside (only on mobile)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        activeDialog &&
        !target.closest(".dock-icon") &&
        !target.closest(".mobile-dialog-content")
      ) {
        setActiveDialog(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeDialog]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] flex justify-center md:hidden">
      <div
        className="floating-dock animate-slide-in flex items-center justify-around"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onTouchStart={() => setIsHovering(true)}
      >
        {ICONS.map(({ id, title, image }) => (
          <button
            key={id}
            onClick={() => handleIconClick(id)}
            onMouseDown={() => setIsPressed(id)}
            onMouseUp={() => setIsPressed(null)}
            onTouchStart={() => setIsPressed(id)}
            onTouchEnd={() => setIsPressed(null)}
            className={cn(
              "dock-icon flex transform flex-col items-center p-2 transition-all duration-300",
              activeDialog === id
                ? "scale-110 bg-blue-900/70 text-white shadow-lg"
                : "text-gray-100",
              isPressed === id && "scale-90",
            )}
          >
            <div
              className={cn(
                "relative mb-1 h-10 w-10 transition-all duration-300",
                activeDialog === id ? "scale-105" : "",
                isHovering && activeDialog !== id ? "scale-105" : "",
              )}
            >
              <Image
                src={image}
                alt={title}
                fill
                className={cn(
                  "object-contain drop-shadow-[0_0_3px_rgba(0,128,255,0.6)]",
                  id === "AGENTS" && "mix-blend-screen brightness-200 filter",
                )}
              />
            </div>
            <span className="text-[10px] font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
              {title}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
