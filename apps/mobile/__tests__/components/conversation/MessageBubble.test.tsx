import React from "react";
import { render } from "@testing-library/react-native";
import { MessageBubble } from "@/components/conversation/MessageBubble";
import type { ConversationMessage } from "@/stores/conversation";

const userMessage: ConversationMessage = {
  id: "msg-1",
  threadId: "thread-1",
  role: "user",
  content: "Fix the login bug",
  timestamp: Date.now(),
};

const assistantMessage: ConversationMessage = {
  id: "msg-2",
  threadId: "thread-1",
  role: "assistant",
  content: "I'll investigate the auth flow now.",
  timestamp: Date.now(),
};

const streamingMessage: ConversationMessage = {
  id: "msg-3",
  threadId: "thread-1",
  role: "assistant",
  content: "Looking at the",
  timestamp: Date.now(),
  isStreaming: true,
};

describe("MessageBubble", () => {
  it("renders user message content", () => {
    const { getByText } = render(<MessageBubble message={userMessage} />);
    expect(getByText("Fix the login bug")).toBeTruthy();
    expect(getByText("You")).toBeTruthy();
  });

  it("renders assistant message content", () => {
    const { getByText } = render(<MessageBubble message={assistantMessage} />);
    expect(getByText("I'll investigate the auth flow now.")).toBeTruthy();
    expect(getByText("Assistant")).toBeTruthy();
  });

  it("shows streaming cursor for streaming messages", () => {
    const { getByText } = render(<MessageBubble message={streamingMessage} />);
    expect(getByText("▊")).toBeTruthy();
  });

  it("does not show cursor for non-streaming messages", () => {
    const { queryByText } = render(<MessageBubble message={assistantMessage} />);
    expect(queryByText("▊")).toBeNull();
  });
});
