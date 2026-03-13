/**
 * Hook providing QR-based and manual pairing flows with the bridge.
 * @returns An object with pairWithQR and pairManually functions.
 */
import { useCallback } from "react";
import { relaySessionManager } from "@/lib/relay-session";

export function usePairing() {
  const pairWithQR = useCallback(async (qrData: {
    v: number;
    relay: string;
    sessionId: string;
    bridgeId: string;
    bridgePublicKey: string;
    bridgeKeyExchangePublicKey: string;
    expiresAt: number;
  }) => {
    if (qrData.expiresAt < Date.now()) {
      throw new Error("QR code has expired");
    }

    await relaySessionManager.pair(qrData);
  }, []);

  const pairManually = useCallback(async (_relayUrl: string, _sessionCode: string) => {
    throw new Error(
      "Manual secure pairing is not implemented yet. Scan the QR code or paste the full QR payload instead.",
    );
  }, []);

  return { pairWithQR, pairManually };
}
