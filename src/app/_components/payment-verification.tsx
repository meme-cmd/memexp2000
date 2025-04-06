"use client";

import { useEffect } from "react";
import { api } from "@/trpc/react";
import { useUser } from "@/hooks/use-user";
import { usePaymentStore } from "@/store/payment-store";

export function PaymentVerification() {
  const { publicKey } = useUser();
  const { addVerifiedTransaction, isWalletVerified } = usePaymentStore();
  
  const { data: paymentStatus } = api.payment.checkPaymentStatus.useQuery(
    { publicKey: publicKey ?? "" },
    { 
      enabled: !!publicKey && !isWalletVerified(publicKey),
      refetchInterval: (query) => {
        if (query.state.data?.verified || query.state.dataUpdatedAt > Date.now() - 60000) {
          return false;
        }
        return 10000;
      },
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  useEffect(() => {
    if (paymentStatus?.verified && paymentStatus.signature && publicKey) {
      addVerifiedTransaction(publicKey, paymentStatus.signature);
    }
  }, [paymentStatus?.verified, paymentStatus?.signature, publicKey, addVerifiedTransaction]);

  return null;
} 