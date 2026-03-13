import { describe, it, expect } from "vitest";
import { AgentStatus } from "./types.js";

describe("AgentStatus", () => {
  it("has all expected values", () => {
    expect(AgentStatus.Idle).toBe("idle");
    expect(AgentStatus.Starting).toBe("starting");
    expect(AgentStatus.Running).toBe("running");
    expect(AgentStatus.Stopping).toBe("stopping");
    expect(AgentStatus.Stopped).toBe("stopped");
    expect(AgentStatus.Error).toBe("error");
  });
});
