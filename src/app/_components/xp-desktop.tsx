"use client";

import React, { useState, useRef, useEffect } from "react";
import { useDialogStore } from "@/store/dialog-store";
import type { DialogId } from "@/store/dialog-store";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useUser } from "@/hooks/use-user";
import { ConnectWalletButton } from "./connect-wallet-button";
import dynamic from "next/dynamic";

// Dynamically import the wallet button to prevent SSR issues
const WalletButton = dynamic(
  () =>
    import("./connect-wallet-button").then((mod) => mod.ConnectWalletButton),
  { ssr: false },
);

interface Icon {
  id: string;
  title: string;
  icon: string;
  position: { x: number; y: number };
}

export function XPDesktop() {
  const { openDialog, selectIcon, selectedIcon } = useDialogStore();
  const { publicKey } = useUser();

  // Format wallet address as "abcd...1234"
  const shortenAddress = (address: string | null) => {
    if (!address) return "Connect Wallet";
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const [icons, setIcons] = useState<Icon[]>([
    {
      id: "AGENTS",
      title: "Agents",
      icon: "computer",
      position: { x: 20, y: 20 },
    },
    {
      id: "BACKROOMS",
      title: "Backrooms",
      icon: "backrooms",
      position: { x: 20, y: 100 },
    },
    {
      id: "USER",
      title: "My Profile",
      icon: "user-profile",
      position: { x: 20, y: 180 },
    },
    {
      id: "WALLET",
      title: shortenAddress(publicKey),
      icon: "wallet",
      position: { x: 20, y: 260 },
    },
    {
      id: "PUBLIC_CHAT",
      title: "Public Chat",
      icon: "chat",
      position: { x: 20, y: 340 },
    },
  ]);

  // Update wallet icon name when publicKey changes
  useEffect(() => {
    setIcons((prev) =>
      prev.map((icon) =>
        icon.id === "WALLET"
          ? { ...icon, title: shortenAddress(publicKey) }
          : icon,
      ),
    );
  }, [publicKey]);

  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const desktopRef = useRef<HTMLDivElement>(null);

  const onMouseDown = (e: React.MouseEvent, id: string) => {
    const icon = icons.find((icon) => icon.id === id);
    if (!icon) return;

    // Calculate offset from the icon's position to where mouse clicked
    setDragOffset({
      x: e.clientX - icon.position.x,
      y: e.clientY - icon.position.y,
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

    setIcons(
      icons.map((icon) => {
        if (icon.id === dragging) {
          return {
            ...icon,
            position: {
              x: e.clientX - dragOffset.x,
              y: e.clientY - dragOffset.y,
            },
          };
        }
        return icon;
      }),
    );
  };

  useEffect(() => {
    const handleClickDesktop = () => {
      selectIcon(null);
    };

    const desktop = desktopRef.current;
    if (desktop) {
      desktop.addEventListener("click", handleClickDesktop);
    }

    return () => {
      if (desktop) {
        desktop.removeEventListener("click", handleClickDesktop);
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
    return date.toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Handle wallet icon click to connect wallet
  const handleWalletClick = () => {
    // For simplicity, we'll just trigger the dialog-store's button action
    useDialogStore.getState().handleButtonClick("connect-wallet");

    // Use the existing pattern of opening a dialog
    if (publicKey) {
      openDialog("USER" as DialogId);
    }
  };

  // Function to render the appropriate icon based on type
  const renderIcon = (iconType: string) => {
    // These classes would typically be provided by XP.css
    let iconClass = "";

    switch (iconType) {
      case "computer":
        return (
          <Image
            src="/0agents.png"
            alt="Agents"
            width={32}
            height={32}
            style={{ objectFit: "contain" }}
          />
        );
      case "backrooms":
        return (
          <Image
            src="/49.png"
            alt="Backrooms"
            width={32}
            height={32}
            style={{ objectFit: "contain" }}
          />
        );
      case "user-profile":
        return (
          <Image
            src="/01.png"
            alt="My Profile"
            width={32}
            height={32}
            style={{ objectFit: "contain" }}
          />
        );
      case "wallet":
        return (
          <Image
            src="/0wallet.png"
            alt="Connect Wallet"
            width={32}
            height={32}
            style={{ objectFit: "contain" }}
          />
        );
      case "chat":
        return (
          <Image
            src="/151.png"
            alt="Public Chat"
            width={32}
            height={32}
            style={{ objectFit: "contain" }}
          />
        );
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
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        height: "100vh",
        width: "100vw",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* Custom style for icons */}
      <style jsx global>{`
        .icon-img {
          object-fit: contain;
          background-color: transparent;
        }
      `}</style>

      {/* Desktop Icons */}
      {icons.map((icon) => (
        <div
          key={icon.id}
          className={cn(
            "desktop-icon absolute",
            selectedIcon === icon.id ? "selected" : "",
          )}
          style={{
            top: icon.position.y,
            left: icon.position.x,
            width: "80px",
            textAlign: "center",
            padding: "5px",
            borderRadius: "3px",
            backgroundColor:
              selectedIcon === icon.id
                ? "rgba(49, 106, 197, 0.3)"
                : "transparent",
          }}
          onMouseDown={(e) => onMouseDown(e, icon.id)}
          onClick={(e) => {
            e.stopPropagation();
            if (icon.id === "WALLET") {
              handleWalletClick();
            }
          }}
          onDoubleClick={() => {
            if (icon.id === "WALLET") {
              handleWalletClick();
            } else {
              openDialog(icon.id as DialogId);
            }
          }}
        >
          <div
            className="icon-image-container mb-1 flex items-center justify-center"
            style={{ height: "32px" }}
          >
            {renderIcon(icon.icon)}
          </div>
          <span
            className={cn(
              "text-center text-xs text-white",
              selectedIcon === icon.id ? "bg-blue-500" : "",
            )}
            style={{
              padding: "2px",
              borderRadius: "3px",
            }}
          >
            {icon.title}
          </span>
        </div>
      ))}

      {/* Windows XP Taskbar */}
      <div
        className="taskbar"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: "30px",
          background: "linear-gradient(to bottom, #2a5ade 0%, #225bda 100%)",
          borderTop: "1px solid #6b8fe4",
          display: "flex",
          alignItems: "center",
          padding: "0 2px",
          zIndex: 1000,
        }}
      >
        {/* Start Button */}
        <button
          className="start-button"
          style={{
            height: "28px",
            background: "linear-gradient(to bottom, #3c8b3d 0%, #277228 100%)",
            borderRadius: "3px",
            marginRight: "5px",
            padding: "0 8px",
            display: "flex",
            alignItems: "center",
            color: "white",
            fontWeight: "bold",
            textShadow: "1px 1px 1px rgba(0, 0, 0, 0.5)",
            border: "1px solid #184517",
          }}
        >
          <Image
            src="/winicon.png"
            alt="Start"
            width={20}
            height={20}
            className="mr-1"
          />
          Start
        </button>

        <div style={{ flex: 1 }}></div>

        {/* Social Links */}
        <div
          className="taskbar-icons"
          style={{
            display: "flex",
            gap: "10px",
            marginRight: "10px",
          }}
        >
          {/* X (Twitter) */}
          <Link
            href="https://x.com"
            target="_blank"
            style={{ display: "block", height: "22px" }}
          >
            <div
              className="social-icon"
              title="X (Twitter)"
              style={{
                width: "22px",
                height: "22px",
                backgroundColor: "#1C1C1C",
                borderRadius: "3px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: "bold",
                fontSize: "14px",
              }}
            >
              𝕏
            </div>
          </Link>

          {/* PumpFun */}
          <Link
            href="https://pumpfun.io"
            target="_blank"
            style={{ display: "block", height: "22px" }}
          >
            <div
              className="social-icon"
              title="PumpFun"
              style={{
                width: "22px",
                height: "22px",
                backgroundColor: "transparent",
                borderRadius: "3px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <Image
                src="/pflogo.png"
                alt="PumpFun"
                width={22}
                height={22}
                style={{ objectFit: "contain" }}
              />
            </div>
          </Link>

          {/* DexScreener */}
          <Link
            href="https://dexscreener.com"
            target="_blank"
            style={{ display: "block", height: "22px" }}
          >
            <div
              className="social-icon"
              title="DexScreener"
              style={{
                width: "22px",
                height: "22px",
                backgroundColor: "transparent",
                borderRadius: "3px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <Image
                src="/dslogo.png"
                alt="DexScreener"
                width={22}
                height={22}
                style={{ objectFit: "contain" }}
              />
            </div>
          </Link>
        </div>

        {/* Clock */}
        <div style={{ marginRight: "5px", color: "white", fontSize: "12px" }}>
          {formatTime(currentTime)}
        </div>
      </div>
    </div>
  );
}
