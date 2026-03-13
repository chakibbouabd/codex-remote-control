import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";

export default function PairScreen() {
  // TODO: Implement actual QR scanning with expo-camera in later commits
  const handleSimulatePair = () => {
    router.replace("/(main)");
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
          <Text style={styles.scannerText}>Camera will open here</Text>
          <Text style={styles.scannerHint}>QR scanner requires camera permissions</Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSimulatePair}>
          <Text style={styles.buttonText}>Simulate Pairing (Dev)</Text>
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
  button: { backgroundColor: "#2563eb", borderRadius: 8, padding: 16, alignItems: "center", width: "100%" },
  buttonText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  linkButton: { marginTop: 16, alignItems: "center" },
  linkText: { color: "#2563eb", fontSize: 14 },
});
