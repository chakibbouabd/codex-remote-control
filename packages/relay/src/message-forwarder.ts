import type { ClientRegistry, SessionPair } from "./client-registry.js";
import {
  type RelayMessage,
  isRelayMessage,
  RelayErrorCode,
  now,
} from "@crc/shared";

/**
 * Forwards messages between the bridge and mobile client in a session.
 *
 * The forwarder does NOT decrypt or inspect encrypted payloads — it only
 * validates the message envelope structure and routes to the paired socket.
 */
export class MessageForwarder {
  constructor(private registry: ClientRegistry) {}

  /**
   * Handle an incoming message from a WebSocket.
   *
   * Determines which session/role the sender belongs to, validates the
   * message, and forwards it to the paired socket.
   */
  handleMessage(ws: import("ws").WebSocket, raw: string): void {
    let message: RelayMessage;
    try {
      const parsed = JSON.parse(raw);
      if (!isRelayMessage(parsed)) {
        this.sendError(ws, RelayErrorCode.InvalidMessage, "Invalid message format");
        return;
      }
      message = parsed;
    } catch {
      this.sendError(ws, RelayErrorCode.InvalidMessage, "Invalid JSON");
      return;
    }

    const entry = this.registry.getSessionForSocket(ws);
    if (!entry) {
      this.sendError(ws, RelayErrorCode.NotPaired, "Not paired to a session");
      return;
    }

    const { session, role } = entry;
    this.registry.touch(session.sessionId);

    // Handle heartbeat
    if (message.type === "heartbeat") {
      const target = role === "bridge" ? session.client : session.bridge;
      if (target && target.readyState === 1) {
        target.send(JSON.stringify({ type: "heartbeat.ack", payload: message.payload }));
      }
      return;
    }

    // Forward all other messages to the paired socket
    const target = role === "bridge" ? session.client : session.bridge;
    if (!target) {
      // Paired socket not connected yet
      return;
    }

    if (target.readyState !== 1) {
      return;
    }

    target.send(raw);
  }

  private sendError(
    ws: import("ws").WebSocket,
    code: RelayErrorCode,
    message: string,
  ): void {
    if (ws.readyState !== 1) return;
    const error: RelayMessage = {
      type: "error",
      payload: { code, message, timestamp: now() },
    };
    ws.send(JSON.stringify(error));
  }
}
