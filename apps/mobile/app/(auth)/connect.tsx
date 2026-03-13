import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";

export default function ConnectScreen() {
  const [relayUrl, setRelayUrl] = useState("wss://relay.codex-remote.control");
  const [sessionCode, setSessionCode] = useState("");

  const handleConnect = () => {
    // TODO: Implement actual connection in later commits
    router.replace("/(main)");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Connect to Bridge</Text>
        <Text style={styles.subtitle}>
          Enter the relay URL and session code from the bridge terminal
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Relay URL</Text>
          <TextInput
            style={styles.input}
            value={relayUrl}
            onChangeText={setRelayUrl}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="wss://relay.example.com"
            placeholderTextColor="#666666"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Session Code</Text>
          <TextInput
            style={styles.input}
            value={sessionCode}
            onChangeText={setSessionCode}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="ABC123"
            placeholderTextColor="#666666"
            maxLength={6}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, sessionCode.length < 3 && styles.buttonDisabled]}
          onPress={handleConnect}
          disabled={sessionCode.length < 3}
        >
          <Text style={styles.buttonText}>Connect</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => router.push("/(auth)/pair")}
        >
          <Text style={styles.linkText}>Or scan a QR code instead →</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111111" },
  content: { flex: 1, padding: 24, justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "bold", color: "#ffffff", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#888888", marginBottom: 32 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "600", color: "#aaaaaa", marginBottom: 8 },
  input: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#333333",
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: "#ffffff",
  },
  button: { backgroundColor: "#2563eb", borderRadius: 8, padding: 16, alignItems: "center", marginTop: 8 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  linkButton: { marginTop: 16, alignItems: "center" },
  linkText: { color: "#2563eb", fontSize: 14 },
});
