import type {
  IUnifiedWalletConfig,
  IWalletNotification,
} from "@jup-ag/wallet-adapter/dist/types/contexts/WalletConnectionProvider";
import { ToastNotification } from "./toast";
import { useUser } from "@/hooks/use-user";

const walletToast = new ToastNotification("wallet-connection", {
  duration: 3000,
  position: "bottom-left",
});

const handleWalletState = {
  onConnect: (publicKey?: string) => {
    useUser.getState().setPublicKey(publicKey ?? null);
  },
  onDisconnect: () => {
    useUser.getState().setPublicKey(null);
  },
};

export const WalletNotification: IUnifiedWalletConfig["notificationCallback"] =
  {
    onConnect: ({ walletName, publicKey }: IWalletNotification) => {
      handleWalletState.onConnect(publicKey?.toString());
      walletToast.success(`✅ Connected to ${walletName}`, {
        icon: "🟢",
      });
    },
    onConnecting: ({ walletName }: IWalletNotification) => {
      walletToast.info(`⏳ Connecting to ${walletName}...`, {
        icon: "🔗",
      });
    },
    onDisconnect: ({ walletName }: IWalletNotification) => {
      handleWalletState.onDisconnect();
      walletToast.error(`🔴 Disconnected from ${walletName}`, {
        icon: "⛔",
      });
    },
    onNotInstalled: ({ walletName }: IWalletNotification) => {
      walletToast.remove();
      walletToast.error(`❌ ${walletName} not installed`, {
        icon: "⚠️",
      });
    },
  };
