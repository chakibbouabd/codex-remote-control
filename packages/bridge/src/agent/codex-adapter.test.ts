import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentStatus } from "./types.js";

const spawnMock = vi.fn();

class MockWebSocket extends EventEmitter {
  static instances: MockWebSocket[] = [];
  static OPEN = 1;
  static CONNECTING = 0;

  readonly readyState = MockWebSocket.OPEN;
  readonly url: string;

  constructor(url: string) {
    super();
    this.url = url;
    MockWebSocket.instances.push(this);
    setTimeout(() => this.emit("open"), 0);
  }

  send(_data: string): void {}

  close(): void {
    this.emit("close");
  }
}

vi.mock("node:child_process", () => ({
  spawn: spawnMock,
}));

vi.mock("ws", () => ({
  default: MockWebSocket,
}));

describe("CodexAdapter", () => {
  beforeEach(() => {
    spawnMock.mockReset();
    MockWebSocket.instances = [];
  });

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

  it("starts codex app-server with an explicit websocket listener", async () => {
    spawnMock.mockImplementation(() => {
      const process = new EventEmitter() as EventEmitter & {
        stdout: EventEmitter;
        stderr: EventEmitter;
        exitCode: number | null;
        kill: ReturnType<typeof vi.fn>;
      };
      process.stdout = new EventEmitter();
      process.stderr = new EventEmitter();
      process.exitCode = null;
      process.kill = vi.fn(() => {
        process.exitCode = 0;
        process.emit("exit", 0);
        return true;
      });

      setTimeout(() => {
        process.stderr.emit(
          "data",
          Buffer.from("codex app-server listening on ws://127.0.0.1:59531"),
        );
      }, 0);

      return process;
    });

    const { CodexAdapter } = await import("./codex-adapter.js");
    const adapter = new CodexAdapter();

    await adapter.start({ cwd: "/tmp" });

    expect(spawnMock).toHaveBeenCalledWith(
      "codex",
      ["app-server", "--listen", "ws://127.0.0.1:0"],
      expect.objectContaining({
        cwd: "/tmp",
        stdio: ["pipe", "pipe", "pipe"],
      }),
    );
    expect(MockWebSocket.instances[0]?.url).toBe("ws://127.0.0.1:59531");
    expect(adapter.getStatus()).toBe(AgentStatus.Running);

    await adapter.stop();
  });
});
