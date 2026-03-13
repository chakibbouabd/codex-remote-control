import { create } from "zustand";

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

interface ConversationState {
  messages: ConversationMessage[];
  isStreaming: boolean;
  pendingApproval: { id: string; command: string } | null;
  activeTurnId: string | null;
  setMessages: (messages: ConversationMessage[]) => void;
  addMessage: (message: ConversationMessage) => void;
  updateMessage: (id: string, updates: Partial<ConversationMessage>) => void;
  setStreaming: (streaming: boolean) => void;
  setPendingApproval: (approval: { id: string; command: string } | null) => void;
  setActiveTurnId: (id: string | null) => void;
  clearMessages: () => void;
}

export const useConversationStore = create<ConversationState>((set) => ({
  messages: [],
  isStreaming: false,
  pendingApproval: null,
  activeTurnId: null,
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),
  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setPendingApproval: (approval) => set({ pendingApproval: approval }),
  setActiveTurnId: (id) => set({ activeTurnId: id }),
  clearMessages: () => set({ messages: [], isStreaming: false, activeTurnId: null }),
}));
