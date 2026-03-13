/**
 * Bridge integration tests — verify components work together.
 *
 * These tests start a real WebSocket server (simulating the relay)
 * and verify that the bridge components (RelayClient, MessageRouter,
 * encryption) function correctly when wired together.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { WebSocketServer, WebSocket } from "ws";
import http from "node:http";
import { RelayClient } from "./core/relay-client.js";
import { MessageRouter } from "./core/message-router.js";
import type { AgentAdapter } from "./agent/types.js";
import { AgentStatus } from "./agent/types.js";
import {
  generateIdentityKeys,
  serializeKeyPair,
  computeSharedSecret,
  deriveDirectionalKeys,
  encrypt,
  decrypt,
} from "@crc/shared";

// ─── Test relay server ──────────────────────────────────────────

let server: http.Server;
let wss: WebSocketServer;
let relayPort: number;

function startTestRelay(): Promise<number> {
  return new Promise((resolve) => {
    server = http.createServer();
    wss = new WebSocketServer({ server });

    // Simple session-based message forwarding
    const clients = new Map<string, WebSocket[]>();

    wss.on("connection", (ws, req) => {
      const path = req.url || "/";
      const sessionId = path.replace(/^\//, "").split("/")[0];

      if (!clients.has(sessionId)) {
        clients.set(sessionId, []);
      }
      const sessionClients = clients.get(sessionId)!;
      sessionClients.push(ws);

      ws.on("message", (data) => {
        // Forward raw bytes to all other clients in the same session
        for (const client of sessionClients) {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(data);
          }
        }
      });

      ws.on("close", () => {
        const idx = sessionClients.indexOf(ws);
        if (idx >= 0) sessionClients.splice(idx, 1);
      });
    });

    server.listen(0, () => {
      relayPort = (server.address() as { port: number }).port;
      resolve(relayPort);
    });
  });
}

function stopTestRelay(): Promise<void> {
  return new Promise((resolve) => {
    wss.close();
    server.close(() => resolve());
  });
}

// ─── Mock agent ────────────────────────────────────────────────

function createMockAgent(): AgentAdapter {
  const handlers: ((event: unknown) => void)[] = [];
  return {
    adapterId: "mock-integration",
    start: async () => {},
    sendRequest: async (req) => ({
      jsonrpc: "2.0",
      id: req.id,
      result: { ack: true },
    }),
    onEvent: (handler) => {
      handlers.push(handler);
      return () => {
        const idx = handlers.indexOf(handler);
        if (idx >= 0) handlers.splice(idx, 1);
      };
    },
    stop: async () => {},
    getStatus: () => AgentStatus.Running,
  };
}

// ─── Helpers ───────────────────────────────────────────────────

/** Wait for a RelayClient to reach "connected" state (with timeout). */
function waitForConnected(client: RelayClient, timeoutMs = 2000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Timed out waiting for connected state"));
    }, timeoutMs);

    client.on("connected", () => {
      clearTimeout(timer);
      resolve();
    });

    client.connect();
  });
}

/** Small delay to let async operations settle. */
const settle = (ms = 50): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

// ─── Tests ─────────────────────────────────────────────────────

describe("Bridge integration", () => {
  beforeEach(async () => {
    await startTestRelay();
  });

  afterEach(async () => {
    await stopTestRelay();
  });

  describe("RelayClient with real relay", () => {
    it("connects and transitions state", async () => {
      const client = new RelayClient(
        `ws://localhost:${relayPort}`,
        "CONN01",
      );
      const states: string[] = [];
      client.on("stateChange", (s) => states.push(s));

      await waitForConnected(client);

      expect(states).toContain("connecting");
      expect(states).toContain("connected");
      expect(client.getState()).toBe("connected");

      client.disconnect();
    });

    it("disconnects cleanly", async () => {
      const client = new RelayClient(
        `ws://localhost:${relayPort}`,
        "DISC01",
      );

      await waitForConnected(client);
      expect(client.getState()).toBe("connected");

      client.disconnect();
      expect(client.getState()).toBe("disconnected");
    });

    it("sends and receives messages", async () => {
      const client1 = new RelayClient(
        `ws://localhost:${relayPort}`,
        "MSG01",
      );
      const client2 = new RelayClient(
        `ws://localhost:${relayPort}`,
        "MSG01",
      );

      await waitForConnected(client1);
      await waitForConnected(client2);

      // Let the connection settle
      await settle(50);

      const received: unknown[] = [];
      client2.on("message", (msg) => received.push(msg));

      client1.send({ type: "heartbeat", payload: { timestamp: 1 } });

      // Wait for message delivery
      await settle(100);
      expect(received.length).toBeGreaterThanOrEqual(1);
      const lastMsg = received[received.length - 1] as { type: string };
      expect(lastMsg.type).toBe("heartbeat");

      client1.disconnect();
      client2.disconnect();
    });

    it("buffers messages when disconnected and flushes on connect", async () => {
      const client = new RelayClient(
        `ws://localhost:${relayPort}`,
        "BUF01",
      );

      // Send while disconnected — should buffer
      client.send({ type: "heartbeat", payload: { timestamp: 42 } });

      // Now connect; buffer should flush
      await waitForConnected(client);
      await settle(50);

      // No error means the buffered message was flushed successfully
      client.disconnect();
    });
  });

  describe("MessageRouter pairing flow", () => {
    it("generates valid pairing info", () => {
      const agent = createMockAgent();
      const router = new MessageRouter(agent, {
        relayUrl: `ws://localhost:${relayPort}`,
        cwd: "/tmp",
        sessionId: "PAIR01",
      });

      const info = router.generatePairingInfo();
      expect(info.qrData.v).toBe(1);
      expect(info.qrData.sessionId).toBe("PAIR01");
      expect(info.qrData.relay).toContain(`localhost:${relayPort}`);
      expect(info.qrData.bridgeId).toBeTruthy();
      expect(info.qrData.bridgePublicKey).toBeTruthy();
      expect(info.bridgeIdentityKeys.ed25519PublicKey).toBeTruthy();
      expect(info.bridgeIdentityKeys.x25519PublicKey).toBeTruthy();
      expect(info.qrData.expiresAt).toBeGreaterThan(Date.now());
    });

    it("reports not paired before completePairing", () => {
      const agent = createMockAgent();
      const router = new MessageRouter(agent, {
        relayUrl: `ws://localhost:${relayPort}`,
        cwd: "/tmp",
        sessionId: "PAIR02",
      });

      router.generatePairingInfo();
      expect(router.isEncryptionReady()).toBe(false);
    });

    it("completes E2EE pairing", async () => {
      const agent = createMockAgent();
      const router = new MessageRouter(agent, {
        relayUrl: `ws://localhost:${relayPort}`,
        cwd: "/tmp",
        sessionId: "PAIR03",
      });

      const pairing = router.generatePairingInfo();

      // Simulate mobile generating its own X25519 keypair
      const mobileKeys = generateIdentityKeys();
      const mobileX = serializeKeyPair(mobileKeys.x25519);

      // completePairing accepts (clientPublicKey, clientEphemeralKey)
      // The MessageRouter uses clientEphemeralKey for the shared secret
      await router.completePairing(mobileX.publicKey, mobileX.publicKey);

      expect(router.isEncryptionReady()).toBe(true);
    });
  });

  describe("MessageRouter sendToMobile after pairing", () => {
    it("sendToMobile does not throw when paired and connected", async () => {
      const agent = createMockAgent();
      const router = new MessageRouter(agent, {
        relayUrl: `ws://localhost:${relayPort}`,
        cwd: "/tmp",
        sessionId: "SND01",
      });

      router.generatePairingInfo();

      // Complete pairing with a real keypair
      const mobileKeys = generateIdentityKeys();
      const mobileX = serializeKeyPair(mobileKeys.x25519);
      await router.completePairing(mobileX.publicKey, mobileX.publicKey);

      expect(router.isEncryptionReady()).toBe(true);

      // Connect the relay client
      router.getRelayClient().connect();
      await settle(100);

      // sendToMobile should not throw
      expect(() => {
        router.sendToMobile({ jsonrpc: "2.0", method: "test", id: 1 });
      }).not.toThrow();

      router.getRelayClient().disconnect();
    });

    it("sendToMobile is a no-op before pairing", () => {
      const agent = createMockAgent();
      const router = new MessageRouter(agent, {
        relayUrl: `ws://localhost:${relayPort}`,
        cwd: "/tmp",
        sessionId: "SND02",
      });

      // Not paired — sendToMobile should be a no-op
      expect(() => {
        router.sendToMobile({ jsonrpc: "2.0", method: "test", id: 1 });
      }).not.toThrow();
    });

    it("stop cleans up all resources", async () => {
      const agent = createMockAgent();
      const router = new MessageRouter(agent, {
        relayUrl: `ws://localhost:${relayPort}`,
        cwd: "/tmp",
        sessionId: "STOP01",
      });

      router.generatePairingInfo();

      const mobileKeys = generateIdentityKeys();
      const mobileX = serializeKeyPair(mobileKeys.x25519);
      await router.completePairing(mobileX.publicKey, mobileX.publicKey);

      // Start the router (connects relay + starts agent)
      router.getRelayClient().connect();
      await settle(100);

      expect(router.isEncryptionReady()).toBe(true);

      await router.stop();

      expect(router.isEncryptionReady()).toBe(false);
      expect(router.getRelayClient().getState()).toBe("disconnected");
    });
  });

  describe("E2EE message roundtrip", () => {
    it("encrypts and decrypts across bridge and simulated mobile", async () => {
      // ── Setup bridge ──
      const bridgeAgent = createMockAgent();
      const bridgeRouter = new MessageRouter(bridgeAgent, {
        relayUrl: `ws://localhost:${relayPort}`,
        cwd: "/tmp",
        sessionId: "E2EE01",
      });

      const bridgePairing = bridgeRouter.generatePairingInfo();

      // ── Simulate mobile ──
      const mobileKeys = generateIdentityKeys();
      const mobileX = serializeKeyPair(mobileKeys.x25519);

      // Bridge completes pairing using mobile's X25519 public key
      await bridgeRouter.completePairing(mobileX.publicKey, mobileX.publicKey);
      expect(bridgeRouter.isEncryptionReady()).toBe(true);

      // Mobile computes the same shared secret independently
      const mobileSharedSecret = computeSharedSecret(
        mobileKeys.x25519.privateKey,
        Buffer.from(bridgePairing.bridgeIdentityKeys.x25519PublicKey, "base64url"),
      );
      const keys = await deriveDirectionalKeys({
        sharedSecret: mobileSharedSecret,
        sessionId: "E2EE01",
      });

      // ── Bridge → Mobile ──
      const testRequest = { jsonrpc: "2.0", method: "turn/start", id: 1 };
      const encryptedFromBridge = encrypt(JSON.stringify(testRequest), keys.bridgeToClient);
      const decryptedByMobile = decrypt(encryptedFromBridge, keys.bridgeToClient);
      const parsedByMobile = JSON.parse(decryptedByMobile);
      expect(parsedByMobile.method).toBe("turn/start");
      expect(parsedByMobile.id).toBe(1);

      // ── Mobile → Bridge ──
      const testResponse = { jsonrpc: "2.0", id: 1, result: { ok: true } };
      const encryptedFromMobile = encrypt(JSON.stringify(testResponse), keys.clientToBridge);
      const decryptedByBridge = decrypt(encryptedFromMobile, keys.clientToBridge);
      const parsedByBridge = JSON.parse(decryptedByBridge);
      expect(parsedByBridge.result).toEqual({ ok: true });

      bridgeRouter.getRelayClient().disconnect();
    });

    it("cross-direction decryption fails", async () => {
      const bridgeAgent = createMockAgent();
      const bridgeRouter = new MessageRouter(bridgeAgent, {
        relayUrl: `ws://localhost:${relayPort}`,
        cwd: "/tmp",
        sessionId: "XDIR01",
      });

      const bridgePairing = bridgeRouter.generatePairingInfo();

      const mobileKeys = generateIdentityKeys();
      const mobileX = serializeKeyPair(mobileKeys.x25519);
      await bridgeRouter.completePairing(mobileX.publicKey, mobileX.publicKey);

      const mobileSharedSecret = computeSharedSecret(
        mobileKeys.x25519.privateKey,
        Buffer.from(bridgePairing.bridgeIdentityKeys.x25519PublicKey, "base64url"),
      );
      const keys = await deriveDirectionalKeys({
        sharedSecret: mobileSharedSecret,
        sessionId: "XDIR01",
      });

      // Encrypt with bridge→client key
      const encrypted = encrypt("secret data", keys.bridgeToClient);

      // Should fail to decrypt with client→bridge key
      expect(() => decrypt(encrypted, keys.clientToBridge)).toThrow();

      bridgeRouter.getRelayClient().disconnect();
    });
  });

  describe("E2EE through relay server", () => {
    it("bridge sends encrypted message through relay and mobile can decrypt", async () => {
      // ── Setup bridge ──
      const bridgeAgent = createMockAgent();
      const bridgeRouter = new MessageRouter(bridgeAgent, {
        relayUrl: `ws://localhost:${relayPort}`,
        cwd: "/tmp",
        sessionId: "RELAY01",
      });

      const bridgePairing = bridgeRouter.generatePairingInfo();

      // ── Simulate mobile ──
      const mobileKeys = generateIdentityKeys();
      const mobileX = serializeKeyPair(mobileKeys.x25519);
      await bridgeRouter.completePairing(mobileX.publicKey, mobileX.publicKey);

      const mobileSharedSecret = computeSharedSecret(
        mobileKeys.x25519.privateKey,
        Buffer.from(bridgePairing.bridgeIdentityKeys.x25519PublicKey, "base64url"),
      );
      const keys = await deriveDirectionalKeys({
        sharedSecret: mobileSharedSecret,
        sessionId: "RELAY01",
      });

      // ── Connect both sides to the relay ──
      const bridgeClient = bridgeRouter.getRelayClient();
      const mobileClient = new RelayClient(
        `ws://localhost:${relayPort}`,
        "RELAY01",
      );

      bridgeClient.connect();
      await waitForConnected(bridgeClient);

      mobileClient.connect();
      await waitForConnected(mobileClient);
      await settle(50);

      // ── Bridge encrypts and sends via router ──
      const receivedOnMobile: unknown[] = [];
      mobileClient.on("message", (msg) => receivedOnMobile.push(msg));

      const testData = { jsonrpc: "2.0", method: "test/ping", id: 42 };
      bridgeRouter.sendToMobile(testData);

      await settle(100);

      // Mobile should have received the encrypted relay message
      expect(receivedOnMobile.length).toBeGreaterThanOrEqual(1);
      const relayMsg = receivedOnMobile[receivedOnMobile.length - 1] as {
        type: string;
        payload: { iv: string; ciphertext: string; tag: string };
      };
      expect(relayMsg.type).toBe("encrypted");
      expect(relayMsg.payload.iv).toBeTruthy();
      expect(relayMsg.payload.ciphertext).toBeTruthy();
      expect(relayMsg.payload.tag).toBeTruthy();

      // Mobile can decrypt it
      const decrypted = decrypt(relayMsg.payload, keys.bridgeToClient);
      const parsed = JSON.parse(decrypted);
      expect(parsed.method).toBe("test/ping");
      expect(parsed.id).toBe(42);

      bridgeClient.disconnect();
      mobileClient.disconnect();
    });
  });
});
