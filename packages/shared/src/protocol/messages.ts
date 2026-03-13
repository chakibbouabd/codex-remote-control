/**
 * Relay protocol message types.
 *
 * These types define the messages that flow between the bridge and the
 * mobile client through the relay server. The relay sees only these
 * envelopes — it does not decrypt or understand the encrypted payload.
 *
 * Protocol flow:
 * 1. Bridge creates session → displays QR with pairing data
 * 2. Mobile scans QR → sends pair.confirm to relay
 * 3. Relay forwards to bridge → both sides derive E2EE keys
 * 4. All subsequent messages use EncryptedPayload
 */

// ─── Relay Message Types ─────────────────────────────────────────

export type RelayMessageType =
  | "pair.confirm"
  | "pair.ready"
  | "encrypted"
  | "heartbeat"
  | "heartbeat.ack"
  | "error"
  | "disconnect";

/** Envelope for all messages between bridge and mobile through the relay. */
export interface RelayMessage {
  type: RelayMessageType;
  payload?: unknown;
}

// ─── Pairing Messages ────────────────────────────────────────────

export interface PairConfirmPayload {
  clientPublicKey: string;
  clientEphemeralKey: string;
  clientId: string;
}

export interface PairReadyPayload {
  bridgePublicKey: string;
  bridgeId: string;
}

// ─── Encrypted Payload ───────────────────────────────────────────

/**
 * Wrapper for end-to-end encrypted application data.
 * The relay forwards this opaque payload between bridge and mobile
 * without being able to read the contents.
 */
export interface EncryptedPayload {
  iv: string;
  ciphertext: string;
  tag: string;
}

export interface EncryptedRelayMessage extends RelayMessage {
  type: "encrypted";
  payload: EncryptedPayload;
}

// ─── Heartbeat ───────────────────────────────────────────────────

export interface HeartbeatPayload {
  timestamp: number;
}

// ─── Error ───────────────────────────────────────────────────────

export interface ErrorPayload {
  code: RelayErrorCode;
  message: string;
}

export enum RelayErrorCode {
  SessionNotFound = "SESSION_NOT_FOUND",
  SessionFull = "SESSION_FULL",
  InvalidMessage = "INVALID_MESSAGE",
  EncryptionError = "ENCRYPTION_ERROR",
  AlreadyPaired = "ALREADY_PAIRED",
  NotPaired = "NOT_PAIRED",
}

// ─── Type Guards ─────────────────────────────────────────────────

export function isRelayMessage(value: unknown): value is RelayMessage {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.type === "string";
}

export function isEncryptedRelayMessage(
  value: unknown,
): value is EncryptedRelayMessage {
  return isRelayMessage(value) && value.type === "encrypted";
}
