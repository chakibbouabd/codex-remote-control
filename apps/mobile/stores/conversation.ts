/**
 * Conversation store managing messages, streaming state, and pending approvals.
 */
import { create } from "zustand";

/**
 * Represents a single message in a conversation.
 * @property id - Unique message identifier.
 * @property threadId - The thread this message belongs to.
 * @property role - Who sent the message (user, assistant, or system).
 * @property content - The text content of the message.
 * @property timestamp - Unix timestamp (ms) when the message was created.
 * @property isStreaming - Whether the message is still being streamed.
 */
export interface ConversationMessage {
  id: string;
  threadId: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

/** Internal state and actions for the conversation store. */
interface ConversationState {
  messages: ConversationMessage[];
  isStreaming: boolean;
  pendingApproval: { id: string; command: string } | null;
  activeTurnId: string | null;
  /** Replace all messages with the given array. */
  setMessages: (messages: ConversationMessage[]) => void;
  /** Append a new message to the list. */
  addMessage: (message: ConversationMessage) => void;
  /** Update a message by merging partial updates. */
  updateMessage: (id: string, updates: Partial<ConversationMessage>) => void;
  /** Toggle whether the assistant is currently streaming. */
  setStreaming: (streaming: boolean) => void;
  /** Set or clear the pending approval request. */
  setPendingApproval: (approval: { id: string; command: string } | null) => void;
  /** Respond to a pending approval (clears it; in future will send to bridge). */
  respondToApproval: (response: { id: string; command: string }) => void;
  /** Set or clear the active conversation turn ID. */
  setActiveTurnId: (id: string | null) => void;
  /** Clear all messages and reset streaming state. */
  clearMessages: () => void;
}

export const useConversationStore = create<ConversationState>((set) => ({
  messages: [],
  isStreaming: false,
  pendingApproval: null,
  activeTurnId: null,
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, ...updates } : m,
      ),
    })),
  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setPendingApproval: (approval) => set({ pendingApproval: approval }),
  respondToApproval: (_response) => set({ pendingApproval: null }),
  setActiveTurnId: (id) => set({ activeTurnId: id }),
  clearMessages: () =>
    set({ messages: [], isStreaming: false, activeTurnId: null }),
}));
