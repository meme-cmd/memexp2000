import { create } from "zustand";

export interface Message {
  id: string;
  content: string;
  sender: "user" | "agent";
  timestamp: Date;
}

interface ChatStore {
  conversations: Map<string, Message[]>;
  currentConversationKey: string | null;
  setCurrentConversation: (userId: string, agentId: string) => void;
  addMessage: (
    userId: string,
    agentId: string,
    message: Omit<Message, "id" | "timestamp">,
  ) => void;
  clearCurrentConversation: () => void;
  clearConversation: (userId: string, agentId: string) => void;
}

export const useChatStore = create<ChatStore>()((set) => ({
  conversations: new Map(),
  currentConversationKey: null,

  setCurrentConversation: (userId, agentId) =>
    set({
      currentConversationKey: `${userId}-${agentId}`,
    }),

  addMessage: (userId, agentId, message) =>
    set((state) => {
      const key = `${userId}-${agentId}`;
      const messages = state.conversations.get(key) ?? [];
      return {
        conversations: new Map(state.conversations).set(key, [
          ...messages,
          {
            id: Math.random().toString(36).substring(7),
            timestamp: new Date(),
            ...message,
          },
        ]),
      };
    }),

  clearCurrentConversation: () => set({ currentConversationKey: null }),

  clearConversation: (userId, agentId) =>
    set((state) => {
      const key = `${userId}-${agentId}`;
      const conversations = new Map(state.conversations);
      conversations.delete(key);
      return { conversations };
    }),
}));
