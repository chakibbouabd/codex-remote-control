/**
 * Protocol constants for CRC relay communication.
 */

/** Heartbeat interval in milliseconds. */
export const HEARTBEAT_INTERVAL_MS = 30_000;

/** Maximum missed heartbeats before disconnecting. */
export const HEARTBEAT_MAX_MISSES = 3;

/** Session code length (alphanumeric). */
export const SESSION_CODE_LENGTH = 6;

/** Default session timeout in milliseconds (1 hour). */
export const SESSION_TIMEOUT_MS = 3_600_000;

/** Maximum number of devices per session (1 bridge + 1 mobile). */
export const MAX_SESSION_CLIENTS = 2;

/** Reconnect backoff base in milliseconds. */
export const RECONNECT_BACKOFF_BASE_MS = 1_000;

/** Reconnect backoff maximum in milliseconds. */
export const RECONNECT_BACKOFF_MAX_MS = 5_000;

/** QR code expiry window in milliseconds (5 minutes). */
export const QR_EXPIRY_MS = 300_000;
