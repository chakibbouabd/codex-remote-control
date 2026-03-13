/**
 * Relay server configuration.
 *
 * All config is driven by environment variables with sensible defaults.
 */

export interface RelayConfig {
  /** Port to listen on. */
  port: number;
  /** Host to bind to. */
  host: string;
  /** Heartbeat interval in milliseconds. */
  heartbeatIntervalMs: number;
  /** Maximum missed heartbeats before disconnect. */
  heartbeatMaxMisses: number;
  /** Session timeout in milliseconds (cleanup idle sessions). */
  sessionTimeoutMs: number;
}

function envInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function envStr(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

export function loadRelayConfig(): RelayConfig {
  return {
    port: envInt("CRC_RELAY_PORT", 3773),
    host: envStr("CRC_RELAY_HOST", "0.0.0.0"),
    heartbeatIntervalMs: envInt("CRC_RELAY_HEARTBEAT_MS", 30_000),
    heartbeatMaxMisses: envInt("CRC_RELAY_MAX_MISSES", 3),
    sessionTimeoutMs: envInt("CRC_RELAY_SESSION_TIMEOUT_MS", 3_600_000),
  };
}
