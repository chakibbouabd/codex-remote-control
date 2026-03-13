import { View, Text, StyleSheet } from "react-native";
import { Link } from "expo-router";

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>404</Text>
      <Text style={styles.subtitle}>Page not found</Text>
      <Link href="/" asChild>
        <Text style={styles.linkText}>Go home</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#111111" },
  title: { fontSize: 48, fontWeight: "bold", color: "#ffffff" },
  subtitle: { fontSize: 18, color: "#888888", marginTop: 8 },
  linkText: { color: "#2563eb", fontSize: 16, marginTop: 24 },
});
