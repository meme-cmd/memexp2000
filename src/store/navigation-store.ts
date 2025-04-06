import { create } from "zustand";
import { agentToast } from "../app/_components/agent-toast";

export interface NavigationItem {
  id: string;
  title: string;
  data: unknown;
}

interface NavigationStore {
  history: NavigationItem[];
  currentView: NavigationItem | null;
  navigate: (item: NavigationItem) => void;
  goBack: (options?: { showSuccess?: boolean; message?: string }) => void;
  canGoBack: () => boolean;
  clearHistory: () => void;
}

export const useNavigationStore = create<NavigationStore>((set, get) => ({
  history: [],
  currentView: null,
  navigate: (item) => {
    set((state) => ({
      history: [...state.history, state.currentView].filter(
        Boolean,
      ) as NavigationItem[],
      currentView: item,
    }));
  },
  goBack: (options) => {
    if (options?.showSuccess && options?.message) {
      agentToast.success(options.message, {
        icon: "✅",
        style: {
          backgroundColor: "#f0fdf4",
          color: "#065f46",
          border: "1px solid #059669",
        },
      });
    }

    set((state) => {
      const newHistory = [...state.history];
      const lastItem = newHistory.pop();
      return {
        history: newHistory,
        currentView: lastItem ?? null,
      };
    });
  },
  canGoBack: () => {
    return get().history.length > 0;
  },
  clearHistory: () => {
    set({ history: [], currentView: null });
  },
}));
