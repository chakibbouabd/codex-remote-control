import {
  useConversationStore,
  type ConversationMessage,
} from "@/stores/conversation";
import { act } from "@testing-library/react-native";

const mockMessage: ConversationMessage = {
  id: "msg-1",
  threadId: "thread-1",
  role: "user",
  content: "Fix the auth bug",
  timestamp: Date.now(),
};

const mockAssistantMsg: ConversationMessage = {
  id: "msg-2",
  threadId: "thread-1",
  role: "assistant",
  content: "I'll look into the login flow...",
  timestamp: Date.now() + 1000,
  isStreaming: true,
};

beforeEach(() => {
  useConversationStore.setState({
    messages: [],
    isStreaming: false,
    pendingApproval: null,
    activeTurnId: null,
  });
});

describe("useConversationStore", () => {
  it("starts with empty messages", () => {
    const state = useConversationStore.getState();
    expect(state.messages).toEqual([]);
    expect(state.isStreaming).toBe(false);
    expect(state.pendingApproval).toBeNull();
    expect(state.activeTurnId).toBeNull();
  });

  it("setMessages replaces all messages", () => {
    act(() => {
      useConversationStore
        .getState()
        .setMessages([mockMessage, mockAssistantMsg]);
    });

    expect(useConversationStore.getState().messages).toHaveLength(2);
  });

  it("addMessage appends to the list", () => {
    act(() => {
      useConversationStore.getState().addMessage(mockMessage);
    });
    act(() => {
      useConversationStore.getState().addMessage(mockAssistantMsg);
    });

    const messages = useConversationStore.getState().messages;
    expect(messages).toHaveLength(2);
    expect(messages[0].id).toBe("msg-1");
    expect(messages[1].id).toBe("msg-2");
  });

  it("updateMessage merges updates into matching message", () => {
    act(() => {
      useConversationStore
        .getState()
        .setMessages([mockAssistantMsg]);
    });

    act(() => {
      useConversationStore
        .getState()
        .updateMessage("msg-2", { isStreaming: false, content: "Done." });
    });

    const msg = useConversationStore.getState().messages[0];
    expect(msg.content).toBe("Done.");
    expect(msg.isStreaming).toBe(false);
    // Role unchanged
    expect(msg.role).toBe("assistant");
  });

  it("updateMessage does not modify non-matching messages", () => {
    act(() => {
      useConversationStore
        .getState()
        .setMessages([mockMessage, mockAssistantMsg]);
    });

    act(() => {
      useConversationStore
        .getState()
        .updateMessage("nonexistent", { content: "hacked" });
    });

    const messages = useConversationStore.getState().messages;
    expect(messages[0].content).toBe("Fix the auth bug");
    expect(messages[1].content).toBe("I'll look into the login flow...");
  });

  it("setStreaming toggles streaming state", () => {
    act(() => {
      useConversationStore.getState().setStreaming(true);
    });
    expect(useConversationStore.getState().isStreaming).toBe(true);

    act(() => {
      useConversationStore.getState().setStreaming(false);
    });
    expect(useConversationStore.getState().isStreaming).toBe(false);
  });

  it("setPendingApproval sets and clears approval request", () => {
    act(() => {
      useConversationStore
        .getState()
        .setPendingApproval({ id: "apr-1", command: "rm -rf node_modules" });
    });

    const approval = useConversationStore.getState().pendingApproval;
    expect(approval).toEqual({ id: "apr-1", command: "rm -rf node_modules" });

    act(() => {
      useConversationStore.getState().setPendingApproval(null);
    });

    expect(useConversationStore.getState().pendingApproval).toBeNull();
  });

  it("setActiveTurnId sets and clears the active turn", () => {
    act(() => {
      useConversationStore.getState().setActiveTurnId("turn-42");
    });
    expect(useConversationStore.getState().activeTurnId).toBe("turn-42");

    act(() => {
      useConversationStore.getState().setActiveTurnId(null);
    });
    expect(useConversationStore.getState().activeTurnId).toBeNull();
  });

  it("clearMessages resets everything to defaults", () => {
    act(() => {
      useConversationStore.getState().addMessage(mockMessage);
      useConversationStore.getState().setStreaming(true);
      useConversationStore.getState().setActiveTurnId("turn-1");
    });

    expect(useConversationStore.getState().messages).toHaveLength(1);

    act(() => {
      useConversationStore.getState().clearMessages();
    });

    const state = useConversationStore.getState();
    expect(state.messages).toEqual([]);
    expect(state.isStreaming).toBe(false);
    expect(state.activeTurnId).toBeNull();
  });
});
