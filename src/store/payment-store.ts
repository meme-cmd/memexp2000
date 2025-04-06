import { create } from "zustand";

interface PaymentVerification {
  signature: string;
  timestamp: Date;
}

interface PaymentState {
  verifiedTransactions: Map<string, PaymentVerification[]>;
  addVerifiedTransaction: (publicKey: string, signature: string) => void;
  isWalletVerified: (publicKey: string) => boolean;
}

export const usePaymentStore = create<PaymentState>((set, get) => ({
  verifiedTransactions: new Map(),
  addVerifiedTransaction: (publicKey: string, signature: string) => 
    set((state) => {
      const transactions = state.verifiedTransactions.get(publicKey) ?? [];
      return {
        verifiedTransactions: new Map(state.verifiedTransactions).set(
          publicKey, 
          [...transactions, { signature, timestamp: new Date() }]
        )
      };
    }),
  isWalletVerified: (publicKey: string) => {
    const transactions = get().verifiedTransactions.get(publicKey);
    return transactions ? transactions.length > 0 : false;
  }
})); 