"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useDialogStore } from "@/store/dialog-store";
import type { DialogId } from "@/store/dialog-store";
import { cn } from "@/lib/utils";

interface Icon {
  id: string;
  title: string;
  svg: React.ReactNode;
  position: { x: number; y: number };
}

export function XPDesktop() {
  const { openDialog, selectIcon, selectedIcon } = useDialogStore();
  const [icons, setIcons] = useState<Icon[]>([
    { 
      id: "AGENTS", 
      title: "Agents", 
      svg: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#4B9CD3" width="48" height="48">
          <circle cx="12" cy="12" r="10" fill="#0078D7" />
          <path d="M12 6a2 2 0 100 4 2 2 0 000-4z" fill="white" />
          <path d="M18 14c-.1-2.2-1.8-4-4-4h-4c-2.2 0-3.9 1.8-4 4v2h12v-2z" fill="white" />
        </svg>
      ),
      position: { x: 20, y: 20 }
    },
    { 
      id: "BACKROOMS", 
      title: "Backrooms", 
      svg: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#4B9CD3" width="48" height="48">
          <rect x="3" y="5" width="18" height="14" rx="2" fill="#FFC83D" />
          <rect x="6" y="8" width="5" height="8" rx="1" fill="#fff" />
          <rect x="13" y="8" width="5" height="8" rx="1" fill="#fff" />
        </svg>
      ),
      position: { x: 20, y: 100 }
    },
    { 
      id: "USER", 
      title: "User Profile", 
      svg: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#4B9CD3" width="48" height="48">
          <circle cx="12" cy="8" r="4" fill="#FFAA44" />
          <path d="M20 19v1a1 1 0 01-1 1H5a1 1 0 01-1-1v-1a6 6 0 0116 0z" fill="#FFAA44" />
        </svg>
      ),
      position: { x: 20, y: 180 }
    }
  ]);
  
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const desktopRef = useRef<HTMLDivElement>(null);
  
  const onMouseDown = (e: React.MouseEvent, id: string) => {
    const icon = icons.find(icon => icon.id === id);
    if (!icon) return;
    
    // Calculate offset from the icon's position to where mouse clicked
    setDragOffset({
      x: e.clientX - icon.position.x,
      y: e.clientY - icon.position.y
    });
    
    setDragging(id);
    selectIcon(id);
    e.stopPropagation();
  };
  
  const onMouseUp = () => {
    setDragging(null);
  };
  
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    
    setIcons(icons.map(icon => {
      if (icon.id === dragging) {
        return {
          ...icon,
          position: { 
            x: e.clientX - dragOffset.x, 
            y: e.clientY - dragOffset.y 
          }
        };
      }
      return icon;
    }));
  };
  
  useEffect(() => {
    const handleClickDesktop = () => {
      selectIcon(null);
    };
    
    const desktop = desktopRef.current;
    if (desktop) {
      desktop.addEventListener('click', handleClickDesktop);
    }
    
    return () => {
      if (desktop) {
        desktop.removeEventListener('click', handleClickDesktop);
      }
    };
  }, [selectIcon]);
  
  // Get current time for taskbar clock
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    
    return () => clearInterval(timer);
  }, []);
  
  const formatTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };
  
  return (
    <div 
      ref={desktopRef}
      className="xp-desktop"
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {icons.map((icon) => (
        <div
          key={icon.id}
          className={cn(
            "absolute flex flex-col items-center w-20 cursor-pointer select-none p-2 rounded",
            selectedIcon === icon.id ? "bg-[#000080]/40" : "hover:bg-white/10",
          )}
          style={{
            top: icon.position.y,
            left: icon.position.x,
          }}
          onMouseDown={(e) => onMouseDown(e, icon.id)}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={() => openDialog(icon.id as DialogId)}
        >
          <div className="h-16 w-16 drop-shadow-[0_0_2px_rgba(0,0,0,0.5)]">
            {icon.svg}
          </div>
          <span className="mt-1 text-center text-sm font-bold text-white drop-shadow-[1px_1px_#000]">
            {icon.title}
          </span>
        </div>
      ))}
      
      {/* Windows XP Taskbar */}
      <div className="xp-taskbar">
        <button className="xp-start-button">
          <span className="text-white font-bold drop-shadow-md">start</span>
        </button>
        <div className="flex-1"></div>
        <div className="mr-2 text-white text-sm">{formatTime(currentTime)}</div>
      </div>
      
      {/* Desktop cleanup notification */}
      <div className="xp-notification">
        <div className="xp-notification-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
          </svg>
        </div>
        <div className="xp-notification-content">
          <h4 className="font-bold">There are unused icons on your desktop</h4>
          <p className="text-xs mt-1">The desktop cleanup wizard can help you clean up your desktop. Click this balloon to start the wizard.</p>
        </div>
        <button className="xp-notification-close">×</button>
      </div>
    </div>
  );
} 