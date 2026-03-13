import { describe, it, expect, beforeEach } from "vitest";
import { RelayClient } from "./relay-client.js";

describe("RelayClient", () => {
  it("constructs with relay URL and session ID", () => {
    const client = new RelayClient("ws://localhost:3000", "ABC123");
    expect(client.getState()).toBe("disconnected");
    expect(client.getSessionId()).toBe("ABC123");
  });

  it("transitions to connecting state on connect()", () => {
    const client = new RelayClient("ws://localhost:3000", "TEST01");

    const stateChanges: string[] = [];
    client.on("stateChange", (state: string) => stateChanges.push(state));

    // connect() will attempt a WebSocket connection and transition to "connecting"
    client.connect();
    expect(stateChanges).toContain("connecting");

    // Clean up — disconnect stops the connection attempt
    client.disconnect();
  });

  it("buffers messages when disconnected", () => {
    const client = new RelayClient("ws://localhost:3000", "TEST02");

    // Sending without connecting should buffer, not throw
    expect(() => {
      client.send({
        type: "heartbeat",
        payload: { timestamp: Date.now() },
      });
    }).not.toThrow();

    client.disconnect();
  });

  it("disconnects cleanly and returns to disconnected state", () => {
    const client = new RelayClient("ws://localhost:3000", "TEST03");

    client.connect();
    client.disconnect();
    expect(client.getState()).toBe("disconnected");
  });

  it("emits stateChange on disconnect", () => {
    const client = new RelayClient("ws://localhost:3000", "TEST04");

    const stateChanges: string[] = [];
    client.on("stateChange", (state: string) => stateChanges.push(state));

    client.disconnect();
    expect(stateChanges).toContain("disconnected");
  });
});
