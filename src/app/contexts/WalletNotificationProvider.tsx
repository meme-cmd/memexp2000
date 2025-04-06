import type {
  IUnifiedWalletConfig,
  IWalletNotification,
} from "@jup-ag/wallet-adapter/dist/types/contexts/WalletConnectionProvider";
import { ToastNotification } from "../_components/toast";

const infoToast = new ToastNotification("wallet-notification-info");
const toast = new ToastNotification("wallet-notification");

export const WalletNotification: IUnifiedWalletConfig["notificationCallback"] =
  {
    onConnect: ({ walletName }: IWalletNotification) => {
      infoToast.info(`Connected to ${walletName}`);
    },
    onConnecting: ({ walletName }: IWalletNotification) => {
      infoToast.info(`Connecting to ${walletName}`);
    },
    onDisconnect: ({ walletName }: IWalletNotification) => {
      infoToast.info(`Disconnected from ${walletName}`);
    },
    onNotInstalled: ({ walletName }: IWalletNotification) => {
      infoToast.remove();
      toast.error(`${walletName} Wallet is not installed`);
    },
  };
