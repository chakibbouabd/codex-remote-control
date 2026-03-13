export interface PairingQrData {
  v: number;
  relay: string;
  sessionId: string;
  bridgeId: string;
  bridgePublicKey: string;
  bridgeKeyExchangePublicKey: string;
  expiresAt: number;
}

export function normalizeRelayUrl(value: string): string {
  return value.trim();
}

export function normalizeSessionCode(value: string): string {
  return value.trim().toUpperCase();
}

export function parsePairingQrPayload(value: string): PairingQrData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("QR payload must be valid JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("QR payload must be a JSON object");
  }

  const data = parsed as Record<string, unknown>;

  if (
    typeof data.v !== "number" ||
    typeof data.relay !== "string" ||
    typeof data.sessionId !== "string" ||
    typeof data.bridgeId !== "string" ||
    typeof data.bridgePublicKey !== "string" ||
    typeof data.bridgeKeyExchangePublicKey !== "string" ||
    typeof data.expiresAt !== "number"
  ) {
    throw new Error("QR payload is missing required pairing fields");
  }

  return {
    v: data.v,
    relay: normalizeRelayUrl(data.relay),
    sessionId: normalizeSessionCode(data.sessionId),
    bridgeId: data.bridgeId,
    bridgePublicKey: data.bridgePublicKey,
    bridgeKeyExchangePublicKey: data.bridgeKeyExchangePublicKey,
    expiresAt: data.expiresAt,
  };
}
