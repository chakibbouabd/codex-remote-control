/**
 * Tests for SecureWebSocketClient.
 *
 * Since the mobile app runs in a browser/React Native environment where
 * WebSocket is a global, we mock it here. These tests verify the client's
 * state machine, message buffering, reconnection logic, and heartbeat.
 */

// Mock WebSocket globally before any imports
class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;
  readyState = MockWebSocket.CLOSED;
  url = "";
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
  }

  send(_data: string) {
    // no-op in mock
  }

  close(_code?: number, _reason?: string) {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }
}

(globalThis as any).WebSocket = MockWebSocket;

// @crc/shared is mocked via __mocks__/@crc/shared.ts manual mock

import { SecureWebSocketClient } from "@/lib/websocket-client";

function getWS(client: SecureWebSocketClient): MockWebSocket {
  return (client as any).ws;
}

describe("SecureWebSocketClient", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("starts in disconnected state", () => {
    const client = new SecureWebSocketClient("wss://relay.example.com", "abc");
    expect(client.getState()).toBe("disconnected");
  });

  it("transitions to connecting then connected on open", () => {
    const client = new SecureWebSocketClient("wss://relay.example.com", "abc");
    client.connect();
    expect(client.getState()).toBe("connecting");

    const ws = getWS(client);
    ws.readyState = MockWebSocket.OPEN;
    ws.onopen?.();
    expect(client.getState()).toBe("connected");
  });

  it("transitions to disconnected on close", () => {
    const client = new SecureWebSocketClient("wss://relay.example.com", "abc");
    client.connect();
    const ws = getWS(client);
    ws.readyState = MockWebSocket.OPEN;
    ws.onopen?.();
    expect(client.getState()).toBe("connected");

    ws.onclose?.();
    expect(client.getState()).toBe("disconnected");
  });

  it("buffers messages when not connected and flushes on reconnect", () => {
    const client = new SecureWebSocketClient("wss://relay.example.com", "abc");

    client.send({ type: "heartbeat", payload: { timestamp: 1 } });
    expect((client as any).outboundBuffer).toHaveLength(1);

    client.connect();
    const ws = getWS(client);
    ws.readyState = MockWebSocket.OPEN;
    ws.onopen?.();

    expect((client as any).outboundBuffer).toHaveLength(0);
  });

  it("sends messages directly when connected", () => {
    const client = new SecureWebSocketClient("wss://relay.example.com", "abc");
    client.connect();
    const ws = getWS(client);
    ws.readyState = MockWebSocket.OPEN;
    ws.onopen?.();

    const sendSpy = jest.spyOn(ws, "send");
    client.send({ type: "heartbeat", payload: { timestamp: 1 } });
    expect(sendSpy).toHaveBeenCalledTimes(1);
  });

  it("disconnect resets state and clears buffers", () => {
    const client = new SecureWebSocketClient("wss://relay.example.com", "abc");
    client.connect();
    const ws = getWS(client);
    ws.readyState = MockWebSocket.OPEN;
    ws.onopen?.();

    client.disconnect();
    expect(client.getState()).toBe("disconnected");
    expect((client as any).outboundBuffer).toHaveLength(0);
    expect((client as any).reconnectAttempts).toBe(0);
  });

  it("calls message handlers when receiving messages", () => {
    const client = new SecureWebSocketClient("wss://relay.example.com", "abc");
    const handler = jest.fn();
    client.onMessage(handler);

    client.connect();
    const ws = getWS(client);
    ws.readyState = MockWebSocket.OPEN;
    ws.onopen?.();

    const mockData = JSON.stringify({ type: "agent.event", payload: { hello: "world" } });
    ws.onmessage?.({ data: mockData });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      type: "agent.event",
      payload: { hello: "world" },
    });
  });

  it("onMessage returns an unsubscribe function", () => {
    const client = new SecureWebSocketClient("wss://relay.example.com", "abc");
    const handler = jest.fn();
    const unsubscribe = client.onMessage(handler);

    unsubscribe();

    client.connect();
    const ws = getWS(client);
    ws.readyState = MockWebSocket.OPEN;
    ws.onopen?.();
    ws.onmessage?.({ data: JSON.stringify({ type: "heartbeat", payload: { timestamp: 1 } }) });

    expect(handler).not.toHaveBeenCalled();
  });

  it("ignores malformed messages", () => {
    const client = new SecureWebSocketClient("wss://relay.example.com", "abc");
    const handler = jest.fn();
    client.onMessage(handler);

    client.connect();
    const ws = getWS(client);
    ws.readyState = MockWebSocket.OPEN;
    ws.onopen?.();

    ws.onmessage?.({ data: "not json {{{" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("starts heartbeat interval when connected", () => {
    const client = new SecureWebSocketClient("wss://relay.example.com", "abc");
    client.connect();
    const ws = getWS(client);
    ws.readyState = MockWebSocket.OPEN;
    ws.onopen?.();

    const sendSpy = jest.spyOn(ws, "send");
    jest.advanceTimersByTime(30000);

    expect(sendSpy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(sendSpy.mock.calls[0][0]);
    expect(parsed.type).toBe("heartbeat");
    expect(typeof parsed.payload.timestamp).toBe("number");
  });

  it("schedules reconnection after unexpected close", () => {
    const client = new SecureWebSocketClient("wss://relay.example.com", "abc");
    client.connect();
    const ws = getWS(client);
    ws.readyState = MockWebSocket.OPEN;
    ws.onopen?.();

    ws.onclose?.();
    expect((client as any).reconnectTimer).toBeTruthy();
  });

  it("does not reconnect when disconnected without prior connection", () => {
    // A client that was never connected should not attempt reconnection
    const client = new SecureWebSocketClient("wss://relay.example.com", "abc");
    expect(client.getState()).toBe("disconnected");

    // Advance time — no crash, no reconnection
    jest.advanceTimersByTime(10000);
    expect(client.getState()).toBe("disconnected");
  });

  it("disconnect resets reconnect attempts to zero", () => {
    const client = new SecureWebSocketClient("wss://relay.example.com", "abc");
    client.connect();
    const ws = getWS(client);
    ws.readyState = MockWebSocket.OPEN;
    ws.onopen?.();

    // Intentional disconnect resets counter
    client.disconnect();
    expect((client as any).reconnectAttempts).toBe(0);
  });
});
