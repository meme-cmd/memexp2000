import { create } from "zustand";

interface UserState {
  publicKey: string | null;
  setPublicKey: (publicKey: string | null) => void;
}

export const useUser = create<UserState>((set) => ({
  publicKey: null,
  setPublicKey: (publicKey) => set({ publicKey }),
}));
