"use client";

import React, { useRef, useState, useEffect } from "react";
import type { DialogId } from "@/store/dialog-store";
import { cn } from "@/lib/utils";

interface XPWindowProps {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  style?: React.CSSProperties;
  onClick?: () => void;
  dialogId: DialogId;
}

export function XPWindow({
  title,
  children,
  isOpen,
  onClose,
  onBack,
  style,
  onClick,
  dialogId,
}: XPWindowProps) {
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Randomize starting position for each window
    setPosition({
      x: 50 + Math.random() * 100,
      y: 50 + Math.random() * 50,
    });
  }, []);

  const startDrag = (e: React.MouseEvent) => {
    if (windowRef.current) {
      setIsDragging(true);
      const rect = windowRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      if (onClick) onClick();
    }
  };

  const onDrag = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    }
  };

  const stopDrag = () => {
    setIsDragging(false);
  };

  const handleBackClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onBack) onBack();
  };

  if (!isOpen) return null;

  // Use the responsive styling class for mobile
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const windowClass = cn("window", { "mobile-window": isMobile });

  return (
    <div
      ref={windowRef}
      className={windowClass}
      style={{
        ...style,
        position: "absolute",
        left: position.x,
        top: position.y,
        width: 500,
        height: 400,
        zIndex: style?.zIndex ?? 10,
      }}
      onClick={onClick}
      onMouseMove={onDrag}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
    >
      <div className="title-bar" onMouseDown={startDrag}>
        <div className="title-bar-text">{title}</div>
        <div className="title-bar-controls">
          {onBack && (
            <button aria-label="Back" onClick={handleBackClick}>
              ←
            </button>
          )}
          <button aria-label="Minimize"></button>
          <button aria-label="Maximize"></button>
          <button
            aria-label="Close"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          ></button>
        </div>
      </div>
      <div
        className="window-body"
        style={{ height: "calc(100% - 30px)", overflow: "auto" }}
      >
        {children}
      </div>
    </div>
  );
}
