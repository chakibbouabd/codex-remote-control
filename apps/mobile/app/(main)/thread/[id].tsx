import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from "react-native";
import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { useConversationStore } from "@/stores/conversation";
import type { ConversationMessage } from "@/stores/conversation";
import { MessageBubble } from "@/components/conversation/MessageBubble";
import { ApprovalCard } from "@/components/conversation/ApprovalCard";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";

export default function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    messages,
    isStreaming,
    pendingApproval,
    activeTurnId,
    addMessage,
    respondToApproval,
    setStreaming,
    setActiveTurnId,
  } = useConversationStore();

  const [input, setInput] = useState("");

  const threadMessages = messages.filter((m) => m.threadId === id);

  const handleSend = () => {
    if (!input.trim()) return;
    const msg = {
      id: Date.now().toString(36),
      threadId: id,
      role: "user" as const,
      content: input.trim(),
      timestamp: Date.now(),
    };
    addMessage(msg);
    setInput("");

    // TODO: Send through WebSocket in Phase 5 wiring
    // Simulate assistant response
    setActiveTurnId(Date.now().toString());
    setStreaming(true);
    setTimeout(() => {
      addMessage({
        id: (Date.now() + 1).toString(36),
        threadId: id,
        role: "assistant",
        content: "I received your message and am processing it. This is a placeholder response — real responses will come from the AI agent through the bridge.",
        timestamp: Date.now(),
        isStreaming: false,
      });
      setStreaming(false);
      setActiveTurnId(null);
    }, 1000);
  };

  const handleInterrupt = () => {
    // TODO: Send turn/interrupt through WebSocket
    setStreaming(false);
    setActiveTurnId(null);
  };

  const renderMessage = ({ item }: { item: ConversationMessage }) => (
    <MessageBubble message={item} />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={threadMessages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptyHint}>Send a message to start coding</Text>
          </View>
        }
      />

      {pendingApproval && (
        <View style={styles.approvalContainer}>
          <ApprovalCard
            command={pendingApproval.command}
            onAccept={() => respondToApproval({ id: pendingApproval.id, command: "accept" })}
            onDecline={() => respondToApproval({ id: pendingApproval.id, command: "decline" })}
          />
        </View>
      )}

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          placeholderTextColor={Colors.textTertiary}
          multiline
          maxLength={10000}
          editable={!isStreaming}
        />
        {isStreaming ? (
          <TouchableOpacity style={[styles.sendButton, styles.stopButton]} onPress={handleInterrupt}>
            <Text style={styles.stopText}>Stop</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!input.trim()}
          >
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  messageList: { padding: Spacing.md, paddingBottom: 100 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: Spacing.xl },
  emptyText: { fontSize: FontSize.lg, color: Colors.textSecondary, marginBottom: Spacing.sm },
  emptyHint: { fontSize: FontSize.sm, color: Colors.textTertiary },
  approvalContainer: { padding: Spacing.md },
  composer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    maxHeight: 120,
    textAlignVertical: "top",
  },
  sendButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    minWidth: 60,
    alignItems: "center",
  },
  sendButtonDisabled: { opacity: 0.4 },
  stopButton: { backgroundColor: Colors.danger },
  sendText: { color: Colors.text, fontSize: FontSize.md, fontWeight: "600" },
  stopText: { color: Colors.text, fontSize: FontSize.md, fontWeight: "600" },
});
