"use client";

import React, { useRef, useState, useEffect } from 'react';
import { DialogId } from '@/store/dialog-store';

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
      y: 50 + Math.random() * 50
    });
  }, []);

  const startDrag = (e: React.MouseEvent) => {
    if (windowRef.current) {
      setIsDragging(true);
      const rect = windowRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      if (onClick) onClick();
    }
  };

  const onDrag = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  const stopDrag = () => {
    setIsDragging(false);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={windowRef}
      className="xp-window"
      style={{
        ...style,
        left: position.x,
        top: position.y,
        width: 500,
        height: 400,
        zIndex: style?.zIndex || 10,
      }}
      onClick={onClick}
      onMouseMove={onDrag}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
    >
      <div 
        className="xp-window-header"
        onMouseDown={startDrag}
      >
        <div className="xp-window-title">
          {title}
        </div>
        <div className="xp-window-controls">
          {onBack && (
            <button className="xp-window-button" onClick={onBack}>
              ←
            </button>
          )}
          <button className="xp-window-button" onClick={(e) => e.stopPropagation()}>
            -
          </button>
          <button className="xp-window-button" onClick={(e) => e.stopPropagation()}>
            □
          </button>
          <button 
            className="xp-window-button close" 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            ×
          </button>
        </div>
      </div>
      <div className="xp-window-content" style={{ height: 'calc(100% - 30px)', overflow: 'auto' }}>
        {children}
      </div>
    </div>
  );
} 