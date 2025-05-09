import "@/styles/globals.css";
import localFont from "next/font/local";
import { ToastNotificationDisplay } from "@/app/_components/toast";
import { TRPCReactProvider } from "@/trpc/react";
import { PaymentVerification } from "./_components/payment-verification";
import { ConnectWalletButton } from "@/app/_components/connect-wallet-button";

const chicago = localFont({
  src: "./_assets/fonts/ChicagoFLF.ttf",
  variable: "--font-chicago",
  display: "swap",
});

export const metadata = {
  title: "Meme XP 2000",
  description:
    "Meme XP 2000 - Create agents, create backrooms, charge users to use your agents in their backrooms. Launch your token!",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={chicago.variable}>
      <head>
        <link rel="stylesheet" href="https://unpkg.com/xp.css" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <style>{`
          /* Responsive adjustments */
          @media (max-width: 768px) {
            .desktop-only { display: none !important; }
            .window { width: 100% !important; height: auto !important; position: fixed !important; top: 0 !important; left: 0 !important; }
            .taskbar { height: auto !important; padding: 5px !important; }
            .taskbar-icons { flex-wrap: wrap !important; justify-content: center !important; }
          }
          #connect-wallet-button {
            position: fixed;
            bottom: -100px;
            opacity: 0;
            pointer-events: none;
          }
          #connect-wallet-button.visible {
            bottom: 20px;
            opacity: 1;
            pointer-events: all;
          }
        `}</style>
      </head>
      <body>
        <TRPCReactProvider>
          <ToastNotificationDisplay />
          <PaymentVerification />
          {children}
          <div id="connect-wallet-button" style={{ position: 'absolute', left: '-9999px' }}>
            <ConnectWalletButton />
          </div>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
