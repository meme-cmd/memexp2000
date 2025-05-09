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
    },
    { 
      id: "RECYCLE", 
      title: "Recycle Bin", 
      svg: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#4B9CD3" width="48" height="48">
          <path d="M9 3v1H4v2h1v13a2 2 0 002 2h10a2 2 0 002-2V6h1V4h-5V3H9z" fill="#57A051" />
          <path d="M10 7h1v12h-1zM13 7h1v12h-1z" fill="white" />
        </svg>
      ),
      position: { x: 20, y: 260 }
    },
    { 
      id: "INTERNET", 
      title: "Internet Explorer", 
      svg: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#4B9CD3" width="48" height="48">
          <circle cx="12" cy="12" r="10" fill="#0078D7" />
          <circle cx="12" cy="12" r="8" fill="#FFFFFF" />
          <circle cx="12" cy="12" r="6" fill="#0078D7" />
          <path d="M12 6 L14 8 L12 10 L10 8 Z" fill="#FFFFFF" />
          <path d="M12 14 L14 16 L12 18 L10 16 Z" fill="#FFFFFF" />
          <path d="M6 12 L8 10 L10 12 L8 14 Z" fill="#FFFFFF" />
          <path d="M14 12 L16 10 L18 12 L16 14 Z" fill="#FFFFFF" />
        </svg>
      ),
      position: { x: 20, y: 340 }
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
  
  return (
    <div 
      ref={desktopRef}
      className="absolute inset-0 w-full h-full"
      style={{
        backgroundColor: '#008080',
        backgroundImage: "url('https://i.imgur.com/MRg20yv.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
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
      <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-r from-[#235edc] to-[#225bda] shadow-md flex items-center px-1 border-t border-[#6b8fe4]">
        <button className="h-8 px-2 flex items-center rounded bg-gradient-to-b from-[#3c8b3d] to-[#277228] hover:from-[#47a448] hover:to-[#2b8a2f] mr-1 border border-[#184517]">
          <span className="text-white font-bold drop-shadow-md">start</span>
        </button>
        <div className="flex-1"></div>
        <div className="mr-2 text-white text-sm">12:45 AM</div>
      </div>
      
      {/* Desktop cleanup notification */}
      <div className="absolute bottom-12 right-4 bg-white p-3 rounded shadow-md border border-gray-400 w-72 flex">
        <div className="mr-2 text-yellow-500 mt-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
          </svg>
        </div>
        <div>
          <p className="font-bold text-sm">There are unused icons on your desktop</p>
          <p className="text-xs mt-1">The desktop cleanup wizard can help you clean up your desktop. Click this balloon to start the wizard.</p>
        </div>
        <button className="absolute -top-1 -right-1 text-xs font-bold bg-gray-200 w-4 h-4 flex items-center justify-center rounded">×</button>
      </div>
    </div>
  );
} 