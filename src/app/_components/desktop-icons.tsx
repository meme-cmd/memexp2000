"use client";

import Image from "next/image";
import { useRef, useEffect } from "react";
import { useDialogStore } from "@/store/dialog-store";
import { ICONS } from "@/constants/icons";
import { cn } from "@/lib/utils";

export function DesktopIcons() {
  const { openDialog, selectIcon, selectedIcon } = useDialogStore();
  const iconsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        iconsRef.current &&
        !iconsRef.current.contains(event.target as Node)
      ) {
        selectIcon(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectIcon]);

  return (
    <div
      ref={iconsRef}
      className="absolute left-4 top-6 flex hidden flex-col gap-8 md:flex"
    >
      {ICONS.map(({ id, title, image }) => (
        <button
          key={id}
          onClick={() => selectIcon(id)}
          onDoubleClick={() => openDialog(id)}
          className={cn(
            "group flex w-28 flex-col items-center gap-2 rounded p-2 text-center transition-colors duration-75",
            selectedIcon === id ? "bg-[#000080]/40" : "hover:bg-white/10",
          )}
        >
          <div className="relative h-16 w-16">
            <Image
              src={image}
              alt={title}
              fill
              className={cn(
                "object-contain drop-shadow-[0_0_2px_rgba(0,128,128,0.5)]",
                id === "AGENTS" && "mix-blend-screen brightness-200 filter",
              )}
            />
          </div>
          <span className="w-full break-words text-sm font-bold text-white drop-shadow-[1px_1px_#000]">
            {title}
          </span>
        </button>
      ))}
    </div>
  );
}
