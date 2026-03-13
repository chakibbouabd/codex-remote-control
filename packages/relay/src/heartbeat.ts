import type { ClientRegistry } from "./client-registry.js";
import type { RelayConfig } from "./config.js";

/**
 * Monitors heartbeats and cleans up stale sessions.
 *
 * Each session tracks lastActivityAt. If a session exceeds the
 * configured timeout without activity, it is closed and removed.
 */
export class HeartbeatMonitor {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private registry: ClientRegistry,
    private config: RelayConfig,
  ) {}

  /**
   * Start the heartbeat cleanup loop.
   */
  start(): void {
    const intervalMs = this.config.heartbeatIntervalMs;
    this.timer = setInterval(() => {
      this.cleanup();
    }, intervalMs);
  }

  /**
   * Stop the heartbeat cleanup loop.
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Check all sessions and close those that have timed out.
   */
  private cleanup(): void {
    const now = Date.now();
    const sessions = this.registry.getAllSessions();

    for (const session of sessions) {
      const elapsed = now - session.lastActivityAt;
      const maxIdle = this.config.heartbeatIntervalMs * this.config.heartbeatMaxMisses;

      if (elapsed > maxIdle && elapsed > this.config.sessionTimeoutMs) {
        this.registry.closeSession(session.sessionId);
      }
    }
  }
}
