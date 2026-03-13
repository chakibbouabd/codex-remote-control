import { describe, it, expect, beforeEach, vi } from "vitest";
import { MessageRouter } from "./message-router.js";
import type { AgentAdapter } from "../agent/types.js";
import { AgentStatus } from "../agent/types.js";

// Create a mock agent adapter for testing
function createMockAgent(): AgentAdapter {
  return {
    adapterId: "mock",
    start: vi.fn().mockResolvedValue(undefined),
    sendRequest: vi.fn().mockResolvedValue({
      jsonrpc: "2.0",
      id: 1,
      result: { ok: true },
    }),
    onEvent: vi.fn().mockReturnValue(() => {}),
    stop: vi.fn().mockResolvedValue(undefined),
    getStatus: vi.fn().mockReturnValue(AgentStatus.Idle),
  };
}

describe("MessageRouter", () => {
  it("creates with agent and config", () => {
    const agent = createMockAgent();
    const router = new MessageRouter(agent, {
      relayUrl: "ws://localhost:3000",
      cwd: "/tmp",
    });
    expect(router.getSessionId()).toBeTruthy();
    expect(router.getSessionId().length).toBe(6);
  });

  it("uses provided session ID", () => {
    const agent = createMockAgent();
    const router = new MessageRouter(agent, {
      relayUrl: "ws://localhost:3000",
      sessionId: "CUSTOM",
      cwd: "/tmp",
    });
    expect(router.getSessionId()).toBe("CUSTOM");
  });

  it("generates pairing info", () => {
    const agent = createMockAgent();
    const router = new MessageRouter(agent, {
      relayUrl: "ws://localhost:3000",
      cwd: "/tmp",
    });
    const info = router.generatePairingInfo();
    expect(info.qrData.v).toBe(1);
    expect(info.qrData.relay).toBe("ws://localhost:3000");
    expect(info.qrData.sessionId).toBe(router.getSessionId());
    expect(info.qrData.bridgeId).toBeTruthy();
    expect(info.qrData.expiresAt).toBeGreaterThan(Date.now());
    expect(info.bridgeIdentityKeys.ed25519PublicKey).toBeTruthy();
    expect(info.bridgeIdentityKeys.x25519PublicKey).toBeTruthy();
  });

  it("reports not connected initially", () => {
    const agent = createMockAgent();
    const router = new MessageRouter(agent, {
      relayUrl: "ws://localhost:3000",
      cwd: "/tmp",
    });
    expect(router.isConnected()).toBe(false);
    expect(router.isEncryptionReady()).toBe(false);
  });
});
