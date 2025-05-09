"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useDialogStore } from "@/store/dialog-store";
import type { DialogId } from "@/store/dialog-store";
import { cn } from "@/lib/utils";
import Image from 'next/image';
import Link from 'next/link';

interface Icon {
  id: string;
  title: string;
  icon: string;
  position: { x: number; y: number };
}

export function XPDesktop() {
  const { openDialog, selectIcon, selectedIcon } = useDialogStore();
  const [icons, setIcons] = useState<Icon[]>([
    { 
      id: "AGENTS", 
      title: "Agents", 
      icon: "computer",
      position: { x: 20, y: 20 }
    },
    { 
      id: "BACKROOMS", 
      title: "Backrooms", 
      icon: "folder",
      position: { x: 20, y: 100 }
    },
    { 
      id: "USER", 
      title: "User Profile", 
      icon: "user",
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

  // Function to render the appropriate icon based on type
  const renderIcon = (iconType: string) => {
    // These classes would typically be provided by XP.css
    let iconClass = "";
    
    switch(iconType) {
      case "computer":
        iconClass = "my-computer-icon";
        break;
      case "folder":
        iconClass = "folder-icon";
        break;
      case "user":
        iconClass = "user-icon";
        break;
      default:
        iconClass = "file-icon";
    }
    
    return <div className={`icon ${iconClass}`}></div>;
  };
  
  return (
    <div 
      ref={desktopRef}
      className="xp-desktop"
      style={{
        backgroundImage: "url('/bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        height: '100vh',
        width: '100vw',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* Desktop Icons */}
      {icons.map((icon) => (
        <div
          key={icon.id}
          className={cn(
            "absolute desktop-icon",
            selectedIcon === icon.id ? "selected" : ""
          )}
          style={{
            top: icon.position.y,
            left: icon.position.x,
            width: '80px',
            textAlign: 'center',
            padding: '5px',
            borderRadius: '3px'
          }}
          onMouseDown={(e) => onMouseDown(e, icon.id)}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={() => openDialog(icon.id as DialogId)}
        >
          {/* Use appropriate HTML structure for XP.css icons */}
          <div className="icon-image" style={{height: '48px', width: '48px', margin: '0 auto'}}>
            {renderIcon(icon.icon)}
          </div>
          <span style={{
            marginTop: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
            color: 'white',
            textShadow: '1px 1px #000',
            wordWrap: 'break-word'
          }}>
            {icon.title}
          </span>
        </div>
      ))}
      
      {/* Windows XP Taskbar */}
      <div 
        className="taskbar" 
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '30px',
          background: 'linear-gradient(to bottom, #2a5ade 0%, #225bda 100%)',
          borderTop: '1px solid #6b8fe4',
          display: 'flex',
          alignItems: 'center',
          padding: '0 2px',
          zIndex: 1000
        }}
      >
        {/* Start Button */}
        <button 
          className="start-button"
          style={{
            height: '28px',
            background: 'linear-gradient(to bottom, #3c8b3d 0%, #277228 100%)',
            borderRadius: '3px',
            marginRight: '5px',
            padding: '0 8px',
            display: 'flex',
            alignItems: 'center',
            color: 'white',
            fontWeight: 'bold',
            textShadow: '1px 1px 1px rgba(0, 0, 0, 0.5)',
            border: '1px solid #184517'
          }}
        >
          start
        </button>
        
        <div style={{ flex: 1 }}></div>
        
        {/* Social Links */}
        <div 
          className="taskbar-icons"
          style={{
            display: 'flex',
            gap: '10px',
            marginRight: '10px'
          }}
        >
          {/* X (Twitter) */}
          <Link href="https://x.com" target="_blank" style={{ display: 'block', height: '22px' }}>
            <div className="social-icon" title="X (Twitter)" style={{ 
              width: '22px', 
              height: '22px',
              backgroundColor: '#1C1C1C',
              borderRadius: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '14px'
            }}>
              𝕏
            </div>
          </Link>
          
          {/* PumpFun */}
          <Link href="https://pumpfun.io" target="_blank" style={{ display: 'block', height: '22px' }}>
            <div className="social-icon" title="PumpFun" style={{ 
              width: '22px', 
              height: '22px',
              backgroundColor: '#FF7E1E',
              borderRadius: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '14px',
              color: 'white'
            }}>
              P
            </div>
          </Link>
          
          {/* DexScreener */}
          <Link href="https://dexscreener.com" target="_blank" style={{ display: 'block', height: '22px' }}>
            <div className="social-icon" title="DexScreener" style={{ 
              width: '22px', 
              height: '22px',
              backgroundColor: '#17DEC6',
              borderRadius: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '14px',
              color: 'white'
            }}>
              D
            </div>
          </Link>
        </div>
        
        {/* Clock */}
        <div style={{ marginRight: '5px', color: 'white', fontSize: '12px' }}>
          {formatTime(currentTime)}
        </div>
      </div>
      
      {/* Desktop Notification */}
      <div 
        className="notification"
        style={{
          position: 'absolute',
          bottom: '40px',
          right: '10px',
          backgroundColor: 'white',
          border: '1px solid #a0a0a0',
          borderRadius: '3px',
          boxShadow: '2px 2px 10px rgba(0,0,0,0.2)',
          padding: '10px',
          width: '280px',
          display: 'flex',
          zIndex: 990
        }}
      >
        <div style={{ marginRight: '10px', color: '#ffcc00' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
          </svg>
        </div>
        <div>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 'bold' }}>
            There are unused icons on your desktop
          </h4>
          <p style={{ margin: 0, fontSize: '12px', color: '#444' }}>
            The desktop cleanup wizard can help you clean up your desktop. Click this balloon to start the wizard.
          </p>
        </div>
        <button 
          style={{ 
            position: 'absolute',
            top: '2px',
            right: '2px',
            width: '16px',
            height: '16px',
            backgroundColor: '#e0e0e0',
            border: '1px solid #a0a0a0',
            borderRadius: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            cursor: 'pointer'
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
} 