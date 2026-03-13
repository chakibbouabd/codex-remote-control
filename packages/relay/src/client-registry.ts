import type { WebSocket } from "ws";
import { generateSessionCode, now, SESSION_CODE_LENGTH } from "@crc/shared";

export interface SessionPair {
  sessionId: string;
  bridge: WebSocket | null;
  client: WebSocket | null;
  createdAt: number;
  lastActivityAt: number;
}

export class ClientRegistry {
  private sessions = new Map<string, SessionPair>();
  private sessionByBridge = new WeakMap<WebSocket, string>();
  private sessionByClient = new WeakMap<WebSocket, string>();

  /**
   * Create a new session with a unique code.
   */
  createSession(): SessionPair {
    let code: string;
    do {
      code = generateSessionCode(SESSION_CODE_LENGTH);
    } while (this.sessions.has(code));

    const session: SessionPair = {
      sessionId: code,
      bridge: null,
      client: null,
      createdAt: now(),
      lastActivityAt: now(),
    };
    this.sessions.set(code, session);
    return session;
  }

  /**
   * Create a session with a specific ID (if not already taken).
   * Returns null if the ID is already in use.
   */
  createSessionWithId(id: string): SessionPair | null {
    if (this.sessions.has(id)) return null;

    const session: SessionPair = {
      sessionId: id,
      bridge: null,
      client: null,
      createdAt: now(),
      lastActivityAt: now(),
    };
    this.sessions.set(id, session);
    return session;
  }

  /**
   * Get or create a session with a specific ID.
   */
  getOrCreateSession(sessionId: string): SessionPair {
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = this.createSessionWithId(sessionId)!;
    }
    return session;
  }

  /**
   * Register a bridge WebSocket to an existing session.
   */
  pairBridge(sessionId: string, ws: WebSocket): SessionPair | null {
    const session = this.sessions.get(sessionId);
    if (!session || session.bridge) return null;

    session.bridge = ws;
    session.lastActivityAt = now();
    this.sessionByBridge.set(ws, sessionId);
    return session;
  }

  /**
   * Register a mobile client WebSocket to an existing session.
   */
  pairClient(sessionId: string, ws: WebSocket): SessionPair | null {
    const session = this.sessions.get(sessionId);
    if (!session || session.client) return null;

    session.client = ws;
    session.lastActivityAt = now();
    this.sessionByClient.set(ws, sessionId);
    return session;
  }

  /**
   * Get session by its ID.
   */
  getSession(sessionId: string): SessionPair | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get session that a WebSocket belongs to, along with the role.
   */
  getSessionForSocket(
    ws: WebSocket,
  ): { session: SessionPair; role: "bridge" | "client" } | null {
    const sessionId = this.sessionByBridge.get(ws);
    if (sessionId) {
      const session = this.sessions.get(sessionId);
      if (session) return { session, role: "bridge" };
    }

    const clientSessionId = this.sessionByClient.get(ws);
    if (clientSessionId) {
      const session = this.sessions.get(clientSessionId);
      if (session) return { session, role: "client" };
    }

    return null;
  }

  /**
   * Remove a WebSocket from its session (on disconnect).
   * Returns the session if it still exists (may be partially empty).
   */
  removeSocket(ws: WebSocket): SessionPair | null {
    const bridgeId = this.sessionByBridge.get(ws);
    if (bridgeId) {
      this.sessionByBridge.delete(ws);
      const session = this.sessions.get(bridgeId);
      if (session) {
        session.bridge = null;
        session.lastActivityAt = now();
        return session;
      }
    }

    const clientId = this.sessionByClient.get(ws);
    if (clientId) {
      this.sessionByClient.delete(ws);
      const session = this.sessions.get(clientId);
      if (session) {
        session.client = null;
        session.lastActivityAt = now();
        return session;
      }
    }

    return null;
  }

  /**
   * Close and delete a session entirely.
   */
  closeSession(sessionId: string): SessionPair | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    if (session.bridge) {
      this.sessionByBridge.delete(session.bridge);
      session.bridge.close(1000, "session_closed");
    }
    if (session.client) {
      this.sessionByClient.delete(session.client);
      session.client.close(1000, "session_closed");
    }

    this.sessions.delete(sessionId);
    return session;
  }

  /**
   * Get all sessions (for health check).
   */
  getAllSessions(): SessionPair[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get active session count.
   */
  get activeSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Touch a session to update its lastActivityAt timestamp.
   */
  touch(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivityAt = now();
    }
  }
}
