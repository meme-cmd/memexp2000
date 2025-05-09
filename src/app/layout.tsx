import "@/styles/globals.css";
import "@/styles/xp.css";
import "@/styles/xp-integration.css";
import localFont from "next/font/local";
import { ToastNotificationDisplay } from "@/app/_components/toast";
import { TRPCReactProvider } from "@/trpc/react";
import { PaymentVerification } from "./_components/payment-verification";

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
      <body>
        <TRPCReactProvider>
          <ToastNotificationDisplay />
          <PaymentVerification />
          {children}
        </TRPCReactProvider>
      </body>
    </html>
  );
}
