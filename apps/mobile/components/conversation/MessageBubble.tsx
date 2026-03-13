/**
 * MessageBubble component that renders a user or assistant message in a chat conversation.
 */
import { View, Text, StyleSheet } from "react-native";
import { Colors, BorderRadius, Spacing, FontSize } from "@/constants/theme";
import type { ConversationMessage } from "@/stores/conversation";

/**
 * Props for the MessageBubble component.
 * @property message - The conversation message to render.
 */
interface MessageBubbleProps {
  message: ConversationMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <View style={[styles.container, isUser ? styles.userBubble : styles.assistantBubble]}>
      {!isUser && <Text style={styles.roleLabel}>Assistant</Text>}
      <Text style={styles.content}>{message.content}</Text>
      {isUser && (
        <Text style={styles.roleLabel}>You</Text>
      )}
      {message.isStreaming && <Text style={styles.cursor}>▊</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: "85%",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 4,
  },
  roleLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginBottom: Spacing.xs,
    fontWeight: "500",
  },
  content: {
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 22,
  },
  cursor: {
    fontSize: FontSize.md,
    color: Colors.primary,
  },
});
