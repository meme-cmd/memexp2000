"use client";

import React from "react";
import { BackgroundGradientAnimation } from "./ui/background-gradient-animation";
import dynamic from "next/dynamic";

interface ContainerProps {
  children: React.ReactNode;
}

export function Container({ children }: ContainerProps) {
  return (
    <BackgroundGradientAnimation>
      <div className="absolute inset-0 z-50 flex w-full items-center justify-center px-0 text-center text-xl sm:px-4 sm:text-2xl md:text-3xl lg:text-4xl xl:text-7xl">
        <div className="w-full max-w-full bg-gradient-to-b from-white/80 to-white/20 bg-clip-text text-transparent drop-shadow-2xl">
          {children}
        </div>
      </div>
    </BackgroundGradientAnimation>
  );
}

export const Containooor = dynamic(() => Promise.resolve(Container), {
  ssr: false,
});
