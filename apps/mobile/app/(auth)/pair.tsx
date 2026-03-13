import { useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Platform } from "react-native";
import { router } from "expo-router";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { usePairing } from "@/hooks/usePairing";
import { parsePairingQrPayload } from "@/lib/pairing";

export default function PairScreen() {
  const [qrPayload, setQrPayload] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const [permission, requestPermission] = useCameraPermissions();
  const { pairWithQR } = usePairing();
  const lastScannedPayloadRef = useRef<string | null>(null);

  const submitPairing = async (payload: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const data = parsePairingQrPayload(payload);
      await pairWithQR(data);
      router.replace("/(main)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse QR payload.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePairFromPayload = async () => {
    await submitPairing(qrPayload);
  };

  const handleBarcodeScanned = async ({ data }: BarcodeScanningResult) => {
    if (isSubmitting || !isScanning || !data || data === lastScannedPayloadRef.current) {
      return;
    }

    lastScannedPayloadRef.current = data;
    setQrPayload(data);
    setIsScanning(false);
    await submitPairing(data);
  };

  const handleRescan = () => {
    lastScannedPayloadRef.current = null;
    setError(null);
    setIsScanning(true);
  };

  const renderScanner = () => {
    if (Platform.OS === "web") {
      return (
        <View style={styles.scannerPlaceholder}>
          <Text style={styles.scannerText}>Live camera scanning is only enabled on mobile devices</Text>
          <Text style={styles.scannerHint}>Paste the QR payload below to continue on web</Text>
        </View>
      );
    }

    if (!permission) {
      return (
        <View style={styles.scannerPlaceholder}>
          <Text style={styles.scannerText}>Checking camera permission...</Text>
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.scannerPlaceholder}>
          <Text style={styles.scannerText}>Camera access is required to scan the bridge QR code</Text>
          <Text style={styles.scannerHint}>You can still paste the QR payload manually below</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => void requestPermission()}>
            <Text style={styles.secondaryButtonText}>Allow Camera Access</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.cameraFrame}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={isScanning ? handleBarcodeScanned : undefined}
        />
        <View style={styles.cameraOverlay} pointerEvents="none">
          <View style={styles.scanWindow} />
        </View>
        {!isScanning && (
          <TouchableOpacity style={styles.secondaryButton} onPress={handleRescan}>
            <Text style={styles.secondaryButtonText}>Scan Again</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Scan QR Code</Text>
        <Text style={styles.subtitle}>
          Point your camera at the QR code displayed in the bridge terminal
        </Text>

        {renderScanner()}

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
    width: 280, minHeight: 280, borderWidth: 2, borderColor: "#333333",
    borderRadius: 16, justifyContent: "center", alignItems: "center",
    marginBottom: 32, backgroundColor: "#0a0a0a", padding: 20,
  },
  scannerText: { color: "#ffffff", fontSize: 16, fontWeight: "600", textAlign: "center" },
  scannerHint: { color: "#666666", fontSize: 14, marginTop: 8, textAlign: "center" },
  cameraFrame: {
    width: 280,
    marginBottom: 32,
    alignItems: "center",
  },
  camera: {
    width: 280,
    height: 280,
    borderRadius: 16,
    overflow: "hidden",
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  scanWindow: {
    width: 180,
    height: 180,
    borderWidth: 2,
    borderColor: "#ffffff",
    borderRadius: 16,
    backgroundColor: "transparent",
  },
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
  secondaryButton: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#2563eb",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondaryButtonText: { color: "#60a5fa", fontSize: 14, fontWeight: "600" },
  errorText: { color: "#ef4444", fontSize: 14, marginBottom: 8, alignSelf: "flex-start" },
  linkButton: { marginTop: 16, alignItems: "center" },
  linkText: { color: "#2563eb", fontSize: 14 },
});
