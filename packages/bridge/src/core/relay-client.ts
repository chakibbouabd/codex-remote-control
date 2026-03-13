/**
 * Relay WebSocket client for the bridge.
 *
 * Connects to the CRC relay server, handles pairing, and provides
 * encrypted message send/receive capabilities.
 *
 * Features:
 * - Automatic reconnect with exponential backoff
 * - Heartbeat keepalive
 * - Message buffering during disconnection
 * - Event-driven state management
 */

import WebSocket from "ws";
import { EventEmitter } from "node:events";
import {
  type RelayMessage,
  type EncryptedRelayMessage,
  isRelayMessage,
  HEARTBEAT_INTERVAL_MS,
  RECONNECT_BACKOFF_BASE_MS,
  RECONNECT_BACKOFF_MAX_MS,
} from "@crc/shared";

export type RelayClientState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "paired";

export class RelayClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private relayUrl: string;
  private sessionId: string;
  private role: "bridge" | "client" = "bridge";
  private state: RelayClientState = "disconnected";
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private outboundBuffer: RelayMessage[] = [];
  private outboundSeq = 0;

  constructor(relayUrl: string, sessionId: string) {
    super();
    this.relayUrl = relayUrl;
    this.sessionId = sessionId;
  }

  getState(): RelayClientState {
    return this.state;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  // ─── Connection ────────────────────────────────────────────────

  connect(): void {
    if (this.ws) return;

    this.state = "connecting";
    this.emit("stateChange", this.state);

    const url = `${this.relayUrl}/${this.sessionId}`;
    this.ws = new WebSocket(url, {
      headers: { "x-role": this.role },
    });

    this.ws.on("open", () => {
      this.state = "connected";
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.flushBuffer();
      this.emit("stateChange", this.state);
      this.emit("connected");
    });

    this.ws.on("message", (data: WebSocket.Data) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (isRelayMessage(parsed)) {
          this.handleMessage(parsed);
        }
      } catch {
        // Ignore malformed messages
      }
    });

    this.ws.on("close", () => {
      const wasConnected =
        this.state === "connected" || this.state === "paired";
      this.state = "disconnected";
      this.stopHeartbeat();
      this.ws = null;
      this.emit("stateChange", this.state);
      this.emit("disconnected");

      if (wasConnected) {
        this.scheduleReconnect();
      }
    });

    this.ws.on("error", (_err) => {
      // Errors are emitted but handled externally; the 'close' event
      // will follow and clean up state.
    });
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      // Only close if the connection is open or currently connecting;
      // calling close() on a CLOSED or CLOSING socket throws.
      if (
        this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING
      ) {
        this.ws.close(1000, "Client disconnect");
      }
      this.ws = null;
    }
    this.state = "disconnected";
    this.outboundBuffer = [];
    this.reconnectAttempts = 0;
    this.emit("stateChange", this.state);
  }

  // ─── Messaging ─────────────────────────────────────────────────

  send(message: RelayMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.outboundSeq++;
      this.ws.send(JSON.stringify(message));
    } else {
      this.outboundBuffer.push(message);
    }
  }

  // ─── Internals ─────────────────────────────────────────────────

  private handleMessage(message: RelayMessage): void {
    switch (message.type) {
      case "heartbeat.ack":
        // Heartbeat acknowledged — connection is alive
        break;

      case "pair.confirm":
        this.state = "paired";
        this.emit("stateChange", this.state);
        this.emit("pairConfirm", message.payload);
        break;

      case "encrypted":
        this.emit("message", message as EncryptedRelayMessage);
        break;

      case "error":
        this.emit("relayError", message.payload);
        break;

      default:
        this.emit("message", message);
    }
  }

  private flushBuffer(): void {
    const buffered = [...this.outboundBuffer];
    this.outboundBuffer = [];
    for (const msg of buffered) {
      this.send(msg);
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: "heartbeat", payload: { timestamp: Date.now() } });
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    const delay = Math.min(
      RECONNECT_BACKOFF_BASE_MS * Math.pow(2, this.reconnectAttempts),
      RECONNECT_BACKOFF_MAX_MS,
    );
    this.reconnectAttempts++;
    this.emit("reconnecting", { attempt: this.reconnectAttempts, delay });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}
