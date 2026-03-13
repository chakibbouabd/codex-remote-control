import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { createRelayServer } from "./server.js";
import { ClientRegistry } from "./client-registry.js";

describe("ClientRegistry", () => {
  let registry: ClientRegistry;

  beforeEach(() => {
    registry = new ClientRegistry();
  });

  it("creates a session with a 6-character code", () => {
    const session = registry.createSession();
    expect(session.sessionId).toHaveLength(6);
    expect(session.bridge).toBeNull();
    expect(session.client).toBeNull();
    expect(session.createdAt).toBeGreaterThan(0);
  });

  it("creates unique session codes", () => {
    const codes = new Set(
      Array.from({ length: 50 }, () => registry.createSession().sessionId),
    );
    expect(codes.size).toBe(50);
  });

  it("pairs a bridge to a session", () => {
    const session = registry.createSession();
    const ws = {} as WebSocket;
    const result = registry.pairBridge(session.sessionId, ws);
    expect(result).toBeTruthy();
    expect(result!.bridge).toBe(ws);
  });

  it("rejects duplicate bridge pairing", () => {
    const session = registry.createSession();
    const ws1 = {} as WebSocket;
    const ws2 = {} as WebSocket;
    registry.pairBridge(session.sessionId, ws1);
    const result = registry.pairBridge(session.sessionId, ws2);
    expect(result).toBeNull();
  });

  it("pairs a client to a session", () => {
    const session = registry.createSession();
    const ws = {} as WebSocket;
    const result = registry.pairClient(session.sessionId, ws);
    expect(result).toBeTruthy();
    expect(result!.client).toBe(ws);
  });

  it("rejects duplicate client pairing", () => {
    const session = registry.createSession();
    const ws1 = {} as WebSocket;
    const ws2 = {} as WebSocket;
    registry.pairClient(session.sessionId, ws1);
    const result = registry.pairClient(session.sessionId, ws2);
    expect(result).toBeNull();
  });

  it("finds session for a registered socket with correct role", () => {
    const session = registry.createSession();
    const bridgeWs = {} as WebSocket;
    const clientWs = {} as WebSocket;
    registry.pairBridge(session.sessionId, bridgeWs);
    registry.pairClient(session.sessionId, clientWs);

    expect(registry.getSessionForSocket(bridgeWs)?.role).toBe("bridge");
    expect(registry.getSessionForSocket(clientWs)?.role).toBe("client");
  });

  it("removes a socket on disconnect", () => {
    const session = registry.createSession();
    const ws = {} as WebSocket;
    registry.pairBridge(session.sessionId, ws);

    const remaining = registry.removeSocket(ws);
    expect(remaining!.bridge).toBeNull();
  });

  it("closes a session entirely", () => {
    const session = registry.createSession();
    const bridgeWs = { close: () => {} } as unknown as WebSocket;
    const clientWs = { close: () => {} } as unknown as WebSocket;
    registry.pairBridge(session.sessionId, bridgeWs);
    registry.pairClient(session.sessionId, clientWs);

    const closed = registry.closeSession(session.sessionId);
    expect(closed).toBeTruthy();
    expect(registry.getSession(session.sessionId)).toBeUndefined();
  });
});

describe("MessageForwarder integration", () => {
  let relay: ReturnType<typeof createRelayServer>;
  let PORT: number;

  beforeEach(async () => {
    // Use a random port to avoid EADDRINUSE
    PORT = 3700 + Math.floor(Math.random() * 100);
    relay = createRelayServer({ port: PORT });
    await relay.start();
  });

  afterEach(() => {
    relay.stop(false);
  });

  it("health check returns ok status", async () => {
    const res = await fetch(`http://localhost:${PORT}/health`);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(typeof body.sessions).toBe("number");
    expect(typeof body.uptime).toBe("number");
  });

  it("rejects invalid session IDs", async () => {
    const ws = new WebSocket(`ws://localhost:${PORT}/?sessionId=xyz&role=bridge`);

    await new Promise<void>((resolve, reject) => {
      ws.on("message", (data) => {
        const msg = JSON.parse(data.toString());
        expect(msg.type).toBe("error");
        resolve();
      });
      ws.on("error", reject);
      ws.on("close", () => resolve());
    });
  });

  it("bridge and client can pair and exchange messages", async () => {
    const sessionId = "A1B2C3";

    // Connect bridge
    const bridgeWs = new WebSocket(`ws://localhost:${PORT}/?sessionId=${sessionId}&role=bridge`);
    await waitForOpen(bridgeWs);

    // Connect client — bridge receives pair.ready
    const clientWs = new WebSocket(`ws://localhost:${PORT}/?sessionId=${sessionId}&role=client`);
    await waitForOpen(clientWs);

    // Bridge receives pair.ready when client connects
    const readyMsg = await waitForMessage(bridgeWs);
    expect(readyMsg.type).toBe("pair.ready");

    // Bridge sends a message → client receives it
    bridgeWs.send(JSON.stringify({ type: "encrypted", payload: { test: true } }));
    const received = await waitForMessage(clientWs);
    expect(received.type).toBe("encrypted");
    expect((received.payload as Record<string, unknown>).test).toBe(true);

    // Client sends back → bridge receives it
    clientWs.send(JSON.stringify({ type: "encrypted", payload: { reply: true } }));
    const reply = await waitForMessage(bridgeWs);
    expect(reply.type).toBe("encrypted");
    expect((reply.payload as Record<string, unknown>).reply).toBe(true);

    bridgeWs.close();
    clientWs.close();
  });

  it("notifies the other party on disconnect", async () => {
    const sessionId = "X9Y8Z7";

    const bridgeWs = new WebSocket(`ws://localhost:${PORT}/?sessionId=${sessionId}&role=bridge`);
    await waitForOpen(bridgeWs);

    const clientWs = new WebSocket(`ws://localhost:${PORT}/?sessionId=${sessionId}&role=client`);
    await waitForOpen(clientWs);

    // Wait for pairing notification on bridge
    await waitForMessage(bridgeWs);

    // Disconnect bridge — client receives disconnect notification
    bridgeWs.close();

    const disconnectMsg = await waitForMessage(clientWs);
    expect(disconnectMsg.type).toBe("disconnect");
    expect((disconnectMsg.payload as Record<string, unknown>).role).toBe("bridge");

    clientWs.close();
  });

  it("heartbeats are acknowledged", async () => {
    const sessionId = "H4H5H6";

    const bridgeWs = new WebSocket(`ws://localhost:${PORT}/?sessionId=${sessionId}&role=bridge`);
    await waitForOpen(bridgeWs);

    const clientWs = new WebSocket(`ws://localhost:${PORT}/?sessionId=${sessionId}&role=client`);
    await waitForOpen(clientWs);
    await waitForMessage(bridgeWs); // pair.ready on bridge

    // Bridge sends heartbeat
    bridgeWs.send(JSON.stringify({ type: "heartbeat", payload: { timestamp: Date.now() } }));

    // Client should receive heartbeat.ack
    const ack = await waitForMessage(clientWs);
    expect(ack.type).toBe("heartbeat.ack");

    bridgeWs.close();
    clientWs.close();
  });
});

// ─── Helpers ─────────────────────────────────────────────────────

function waitForOpen(ws: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    ws.on("open", resolve);
    ws.on("error", reject);
    setTimeout(() => reject(new Error("WebSocket open timeout")), 3000);
  });
}

function waitForMessage(ws: WebSocket): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const handler = (data: Buffer) => {
      ws.off("message", handler);
      resolve(JSON.parse(data.toString()));
    };
    ws.on("message", handler);
    ws.on("error", reject);
    setTimeout(() => reject(new Error("Message timeout")), 3000);
  });
}
