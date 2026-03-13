import { describe, it, expect } from "vitest";
import { AgentStatus } from "./types.js";

// The Codex adapter requires spawning `codex app-server` which is an external
// binary. We test the class structure and verify the agent status enum values.
describe("CodexAdapter", () => {
  it("has the correct adapter status values", () => {
    expect(AgentStatus.Idle).toBe("idle");
    expect(AgentStatus.Starting).toBe("starting");
    expect(AgentStatus.Running).toBe("running");
    expect(AgentStatus.Stopping).toBe("stopping");
    expect(AgentStatus.Stopped).toBe("stopped");
    expect(AgentStatus.Error).toBe("error");
  });

  it("exports the adapter class with correct adapter ID", async () => {
    const { CodexAdapter } = await import("./codex-adapter.js");
    const adapter = new CodexAdapter();
    expect(adapter.adapterId).toBe("codex-v2");
    expect(adapter.getStatus()).toBe(AgentStatus.Idle);
  });
});
