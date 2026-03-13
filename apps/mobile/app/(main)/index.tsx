import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";

interface Thread {
  id: string;
  title: string;
  preview: string;
  updatedAt: number;
}

const PLACEHOLDER_THREADS: Thread[] = [
  { id: "1", title: "Fix login bug", preview: "The login form throws an error when...", updatedAt: Date.now() - 60000 },
  { id: "2", title: "Add dark mode", preview: "Implement theme switching using...", updatedAt: Date.now() - 3600000 },
  { id: "3", title: "Refactor API layer", preview: "Move all API calls to a dedicated...", updatedAt: Date.now() - 86400000 },
];

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function ThreadsScreen() {
  const renderItem = ({ item }: { item: Thread }) => (
    <TouchableOpacity style={styles.threadCard}>
      <View style={styles.threadHeader}>
        <Text style={styles.threadTitle}>{item.title}</Text>
        <Text style={styles.threadTime}>{formatRelativeTime(item.updatedAt)}</Text>
      </View>
      <Text style={styles.threadPreview} numberOfLines={2}>{item.preview}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={PLACEHOLDER_THREADS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>&#x1F4AC;</Text>
            <Text style={styles.emptyTitle}>No threads yet</Text>
            <Text style={styles.emptySubtitle}>Start a new conversation with the AI agent</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111111" },
  list: { padding: 12 },
  threadCard: { backgroundColor: "#1a1a1a", borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: "#222222" },
  threadHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  threadTitle: { fontSize: 16, fontWeight: "600", color: "#ffffff", flex: 1 },
  threadTime: { fontSize: 12, color: "#666666" },
  threadPreview: { fontSize: 14, color: "#888888", lineHeight: 20 },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 120 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#ffffff", marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: "#888888", textAlign: "center", paddingHorizontal: 32 },
});
