import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from "react-native";
import { router } from "expo-router";
import { usePairing } from "@/hooks/usePairing";
import { parsePairingQrPayload } from "@/lib/pairing";

export default function PairScreen() {
  const [qrPayload, setQrPayload] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { pairWithQR } = usePairing();

  const handlePairFromPayload = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const data = parsePairingQrPayload(qrPayload);
      await pairWithQR(data);
      router.replace("/(main)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse QR payload.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Scan QR Code</Text>
        <Text style={styles.subtitle}>
          Point your camera at the QR code displayed in the bridge terminal
        </Text>

        <View style={styles.scannerPlaceholder}>
          <Text style={styles.scannerIcon}>📷</Text>
          <Text style={styles.scannerText}>Camera scanning is not wired yet</Text>
          <Text style={styles.scannerHint}>Paste the QR payload from the bridge to continue locally</Text>
        </View>

        <TextInput
          style={styles.payloadInput}
          value={qrPayload}
          onChangeText={setQrPayload}
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          placeholder='{"v":1,"relay":"ws://127.0.0.1:3773",...}'
          placeholderTextColor="#666666"
        />

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.button, (!qrPayload.trim() || isSubmitting) && styles.buttonDisabled]}
          onPress={handlePairFromPayload}
          disabled={!qrPayload.trim() || isSubmitting}
        >
          <Text style={styles.buttonText}>{isSubmitting ? "Pairing..." : "Pair From QR Payload"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={() => router.back()}>
          <Text style={styles.linkText}>← Enter code manually</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111111" },
  content: { flex: 1, padding: 24, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "bold", color: "#ffffff", marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 16, color: "#888888", marginBottom: 32, textAlign: "center", paddingHorizontal: 16 },
  scannerPlaceholder: {
    width: 280, height: 280, borderWidth: 2, borderColor: "#333333",
    borderRadius: 16, justifyContent: "center", alignItems: "center",
    marginBottom: 32, backgroundColor: "#0a0a0a",
  },
  scannerIcon: { fontSize: 48, marginBottom: 12 },
  scannerText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  scannerHint: { color: "#666666", fontSize: 14, marginTop: 8 },
  payloadInput: {
    width: "100%",
    minHeight: 120,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#333333",
    borderRadius: 8,
    padding: 14,
    fontSize: 14,
    color: "#ffffff",
    textAlignVertical: "top",
    marginBottom: 12,
  },
  button: { backgroundColor: "#2563eb", borderRadius: 8, padding: 16, alignItems: "center", width: "100%" },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  errorText: { color: "#ef4444", fontSize: 14, marginBottom: 8, alignSelf: "flex-start" },
  linkButton: { marginTop: 16, alignItems: "center" },
  linkText: { color: "#2563eb", fontSize: 14 },
});
