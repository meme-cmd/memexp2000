import { create } from "zustand";
import { useNavigationStore } from "./navigation-store";
import type { NavigationItem } from "./navigation-store";

export interface DialogContent {
  title: string;
  desc: string;
  button?: {
    text: string;
    action: string;
  };
}

export type DialogId =
  | "AGENTS"
  | "BACKROOMS"
  | "BACKROOM_DETAIL"
  | "CHAT"
  | "CREATE_AGENT"
  | "CREATE_BACKROOM"
  | "USER";

export const DIALOG_CONTENT: Record<DialogId, DialogContent> = {
  AGENTS: {
    title: "Agents",
    desc: "Available Agents",
    button: {
      text: "Create Agent",
      action: "create-agent",
    },
  },
  BACKROOMS: {
    title: "Backrooms",
    desc: "Multi-Agent Discussion Spaces",
    button: {
      text: "Create Backroom",
      action: "create-backroom",
    },
  },
  BACKROOM_DETAIL: {
    title: "Backroom Discussion",
    desc: "Real-time Agent Conversation",
  },
  CHAT: {
    title: "Agent Chat",
    desc: "One-on-One Agent Conversation",
  },
  CREATE_AGENT: {
    title: "Create Agent",
    desc: "Create a New Agent",
  },
  CREATE_BACKROOM: {
    title: "Create Backroom",
    desc: "Create a New Backroom",
  },
  USER: {
    title: "User",
    desc: "User Profile",
  },
};

export interface DialogState {
  id: DialogId;
  history: NavigationItem[];
  currentView: NavigationItem;
  zIndex: number;
}

interface DialogStore {
  openDialogs: DialogState[];
  selectedIcon: string | null;
  openDialog: (id: DialogId) => void;
  closeDialog: (id: DialogId) => void;
  selectIcon: (id: string | null) => void;
  handleButtonClick: (action: string) => void;
  goBack: (dialogId: DialogId) => void;
  canGoBack: (dialogId: DialogId) => boolean;
  updateDialogView: (dialogId: DialogId, newView: NavigationItem) => void;
  bringToFront: (dialogId: DialogId) => void;
}

export const useDialogStore = create<DialogStore>((set, get) => ({
  openDialogs: [],
  selectedIcon: null,
  openDialog: (id) =>
    set((state) => ({
      openDialogs: state.openDialogs.some((dialog) => dialog.id === id)
        ? state.openDialogs
        : [
            ...state.openDialogs,
            {
              id,
              history: [],
              currentView: {
                id,
                title: DIALOG_CONTENT[id].title,
                data: null,
              },
              zIndex:
                Math.max(0, ...state.openDialogs.map((d) => d.zIndex)) + 1,
            },
          ],
    })),
  closeDialog: (id) =>
    set((state) => ({
      openDialogs: state.openDialogs.filter((dialog) => dialog.id !== id),
    })),
  selectIcon: (id) => set({ selectedIcon: id }),
  handleButtonClick: (action) => {
    const navigationStore = useNavigationStore.getState();
    if (action === "create-agent") {
      navigationStore.navigate({
        id: "CREATE_AGENT",
        title: "Create Agent",
        data: null,
      });
    }
    if (action === "create-backroom") {
      navigationStore.navigate({
        id: "CREATE_BACKROOM",
        title: "Create Backroom",
        data: null,
      });
    }
  },
  goBack: (dialogId) => {
    set((state) => {
      const dialogIndex = state.openDialogs.findIndex((d) => d.id === dialogId);
      if (dialogIndex === -1) return state;

      const dialog = state.openDialogs[dialogIndex];
      const newHistory = [...dialog.history];
      const lastView = newHistory.pop();

      if (!lastView) return state;

      const newDialogs = [...state.openDialogs];
      newDialogs[dialogIndex] = {
        ...dialog,
        history: newHistory,
        currentView: lastView,
      };

      return { openDialogs: newDialogs };
    });
  },
  canGoBack: (dialogId) => {
    const dialog = get().openDialogs.find((d) => d.id === dialogId);
    return Boolean(dialog && dialog.history.length > 0);
  },
  updateDialogView: (dialogId, newView) => {
    set((state) => {
      const dialogIndex = state.openDialogs.findIndex((d) => d.id === dialogId);
      if (dialogIndex === -1) return state;

      const dialog = state.openDialogs[dialogIndex];
      const newDialogs = [...state.openDialogs];
      newDialogs[dialogIndex] = {
        ...dialog,
        history: [...dialog.history, dialog.currentView],
        currentView: newView,
      };

      return { openDialogs: newDialogs };
    });
  },
  bringToFront: (dialogId) => {
    set((state) => {
      const maxZ = Math.max(...state.openDialogs.map((d) => d.zIndex));
      return {
        openDialogs: state.openDialogs.map((dialog) =>
          dialog.id === dialogId ? { ...dialog, zIndex: maxZ + 1 } : dialog,
        ),
      };
    });
  },
}));
