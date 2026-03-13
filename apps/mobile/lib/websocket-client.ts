/**
 * Secure WebSocket client for the CRC mobile app.
 *
 * Connects to the relay server as the mobile client, auto-reconnects with
 * exponential backoff, and buffers messages while disconnected.
 */

import { type RelayMessage } from "@crc/shared";

type ClientState = "disconnected" | "connecting" | "connected";

type MessageHandler = (message: RelayMessage) => void;
type StateHandler = (state: ClientState) => void;

export class SecureWebSocketClient {
  private ws: WebSocket | null = null;
  private relayUrl: string;
  private sessionId: string;
  private role: "client" | "bridge";
  private state: ClientState = "disconnected";
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private outboundBuffer: RelayMessage[] = [];
  private messageHandlers: Set<MessageHandler> = new Set();
  private stateHandlers: Set<StateHandler> = new Set();

  constructor(
    relayUrl: string,
    sessionId: string,
    role: "client" | "bridge" = "client",
  ) {
    this.relayUrl = relayUrl;
    this.sessionId = sessionId;
    this.role = role;
  }

  getState(): ClientState {
    return this.state;
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => { this.messageHandlers.delete(handler); };
  }

  onStateChange(handler: StateHandler): () => void {
    this.stateHandlers.add(handler);
    return () => { this.stateHandlers.delete(handler); };
  }

  connect(): void {
    if (this.ws) return;
    this.setState("connecting");

    const url = `${this.relayUrl}/${this.sessionId}?role=${this.role}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.setState("connected");
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.flushBuffer();
    };

    this.ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as RelayMessage;
        this.messageHandlers.forEach((h) => h(parsed));
      } catch {
        // Ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      const wasConnected = this.state === "connected";
      this.setState("disconnected");
      this.stopHeartbeat();
      this.ws = null;
      if (wasConnected) this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      // Error is handled by onclose
    };
  }

  send(message: RelayMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.outboundBuffer.push(message);
    }
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }
    this.setState("disconnected");
    this.outboundBuffer = [];
    this.reconnectAttempts = 0;
  }

  private flushBuffer(): void {
    const buffered = [...this.outboundBuffer];
    this.outboundBuffer = [];
    buffered.forEach((msg) => this.send(msg));
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: "heartbeat", payload: { timestamp: Date.now() } });
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 5000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private setState(state: ClientState): void {
    this.state = state;
    this.stateHandlers.forEach((handler) => handler(state));
  }
}
