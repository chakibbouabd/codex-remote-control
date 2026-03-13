/**
 * Hook providing QR-based and manual pairing flows with the bridge.
 * @returns An object with pairWithQR and pairManually functions.
 */
import { useCallback } from "react";
import { generateClientKeyPair } from "@/lib/crypto-client";
import { useSessionStore } from "@/stores/session";

export function usePairing() {
  const { setPaired, setStatus } = useSessionStore();

  const pairWithQR = useCallback(async (qrData: {
    v: number;
    relay: string;
    sessionId: string;
    bridgeId: string;
    bridgePublicKey: string;
    expiresAt: number;
  }) => {
    // Check if QR is expired
    if (qrData.expiresAt < Date.now()) {
      throw new Error("QR code has expired");
    }

    // Generate our identity keys (async — uses WebCrypto API)
    const keys = await generateClientKeyPair();

    // Send pair.confirm message to relay
    // (this will be done via the WebSocket connection)
    // For now, store the keys and session info
    setPaired(qrData.relay, qrData.sessionId, qrData.bridgeId);
    setStatus("pairing");

    // TODO: Send pair.confirm via WebSocket, complete E2EE handshake
    // in a follow-up commit
  }, [setPaired, setStatus]);

  const pairManually = useCallback(async (relayUrl: string, sessionCode: string) => {
    pairWithQR({
      v: 1,
      relay: relayUrl,
      sessionId: sessionCode,
      bridgeId: "manual",
      bridgePublicKey: "",
      expiresAt: Date.now() + 300000,
    });
  }, [pairWithQR]);

  return { pairWithQR, pairManually };
}
