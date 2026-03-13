/**
 * CodexAdapter — spawns `codex app-server` and communicates over WebSocket.
 *
 * This adapter:
 * 1. Spawns the `codex` binary in `app-server` mode
 * 2. Parses stdout for the WebSocket URL
 * 3. Connects to that WebSocket
 * 4. Sends JSON-RPC requests and collects responses by ID
 * 5. Emits event notifications (JSON-RPC notifications) to subscribers
 */

import { spawn, type ChildProcess } from "node:child_process";
import WebSocket from "ws";
import { EventEmitter } from "node:events";
import type { JsonRpcRequest, JsonRpcResponse, CodexEvent } from "@crc/shared";
import { isJsonRpcResponse, isJsonRpcNotification } from "@crc/shared";
import type { AgentAdapter, AgentConfig } from "./types.js";
import { AgentStatus } from "./types.js";

const CODEX_BIN = "codex";
const CODEX_APP_SERVER_LISTEN_URL = "ws://127.0.0.1:0";
const WS_URL_REGEX = /ws:\/\/[^\s]+/;

/**
 * Agent adapter that spawns the Codex CLI in app-server mode
 * and communicates with it via JSON-RPC over WebSocket.
 */
export class CodexAdapter implements AgentAdapter {
  readonly adapterId = "codex-v2";

  private status: AgentStatus = AgentStatus.Idle;
  private process: ChildProcess | null = null;
  private ws: WebSocket | null = null;
  private config: AgentConfig | null = null;

  private pendingRequests = new Map<
    string | number,
    {
      resolve: (value: JsonRpcResponse) => void;
      reject: (reason: unknown) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();

  private eventEmitter = new EventEmitter();
  private nextId = 1;
  private requestTimeout = 30_000; // 30 seconds

  // ─── Lifecycle ─────────────────────────────────────────────────

  /**
   * Spawns the Codex app-server process and connects to its WebSocket.
   * @param config - Agent configuration including working directory and options.
   * @returns A promise that resolves when the agent is running.
   */
  async start(config: AgentConfig): Promise<void> {
    this.config = config;
    this.status = AgentStatus.Starting;

    // 1. Spawn `codex app-server` with an explicit WebSocket listener.
    // Recent Codex CLI builds default to stdio transport unless `--listen` is set.
    this.process = spawn(
      CODEX_BIN,
      ["app-server", "--listen", CODEX_APP_SERVER_LISTEN_URL],
      {
      cwd: config.cwd,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
      },
    );

    // 2. Parse startup logs until we see a ws:// URL.
    // Codex app-server writes the WebSocket listener banner to stderr.
    const wsUrl = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Timeout waiting for Codex app-server to start")),
        15_000,
      );

      const parseWsUrl = (data: Buffer) => {
        const text = data.toString();
        const match = text.match(WS_URL_REGEX);
        if (match) {
          clearTimeout(timeout);
          resolve(match[0]);
        }
      };

      this.process!.stdout!.on("data", parseWsUrl);
      this.process!.stderr!.on("data", parseWsUrl);

      this.process!.on("error", (err) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to spawn codex: ${err.message}`));
      });

      this.process!.on("exit", (code) => {
        clearTimeout(timeout);
        if (this.status === AgentStatus.Starting) {
          reject(
            new Error(`Codex exited before WebSocket was ready (code ${code})`),
          );
        }
      });
    });

    // 3. Connect to the WebSocket
    await this.connectWebSocket(wsUrl);
    this.status = AgentStatus.Running;
  }

  /**
   * Stops the Codex process, closes the WebSocket, and rejects pending requests.
   * @returns A promise that resolves when the agent has fully stopped.
   */
  async stop(): Promise<void> {
    this.status = AgentStatus.Stopping;

    if (this.ws) {
      if (
        this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING
      ) {
        this.ws.close();
      }
      this.ws = null;
    }

    if (this.process) {
      this.process.kill("SIGTERM");

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          this.process?.kill("SIGKILL");
          resolve();
        }, 5_000);

        const onExit = () => {
          clearTimeout(timeout);
          resolve();
        };

        if (this.process!.exitCode !== null) {
          clearTimeout(timeout);
          resolve();
        } else {
          this.process!.once("exit", onExit);
        }
      });

      this.process = null;
    }

    // Reject all pending requests
    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(new Error("Agent stopped"));
    }
    this.pendingRequests.clear();
    this.status = AgentStatus.Stopped;
  }

  /** Returns the current lifecycle status of the agent. */
  getStatus(): AgentStatus {
    return this.status;
  }

  // ─── Messaging ─────────────────────────────────────────────────

  /**
   * Sends a JSON-RPC request to the Codex agent and waits for the response.
   * @param request - The JSON-RPC request to send.
   * @returns A promise resolving to the typed JSON-RPC response.
   * @throws If the agent is not connected or the request times out.
   */
  async sendRequest<T = unknown>(
    request: JsonRpcRequest,
  ): Promise<JsonRpcResponse<T>> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Agent not connected");
    }

    const id = request.id ?? this.nextId++;
    const outgoing: JsonRpcRequest = { ...request, id };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${request.method}`));
      }, this.requestTimeout);

      this.pendingRequests.set(id, {
        resolve: resolve as (value: JsonRpcResponse) => void,
        reject,
        timer,
      });

      this.ws!.send(JSON.stringify(outgoing));
    });
  }

  /**
   * Subscribes to Codex event notifications.
   * @param handler - Callback invoked with each event notification.
   * @returns An unsubscribe function to remove the event listener.
   */
  onEvent(handler: (event: CodexEvent) => void): () => void {
    this.eventEmitter.on("event", handler);
    return () => {
      this.eventEmitter.off("event", handler);
    };
  }

  // ─── WebSocket ─────────────────────────────────────────────────

  private connectWebSocket(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);

      const timeout = setTimeout(
        () => reject(new Error("WebSocket connection timeout")),
        10_000,
      );

      this.ws.on("open", () => {
        clearTimeout(timeout);
        resolve();
      });

      this.ws.on("message", (data: WebSocket.Data) => {
        this.handleMessage(data);
      });

      this.ws.on("close", () => {
        this.status = AgentStatus.Stopped;
        for (const [, pending] of this.pendingRequests) {
          clearTimeout(pending.timer);
          pending.reject(new Error("WebSocket closed"));
        }
        this.pendingRequests.clear();
      });

      this.ws.on("error", (_err) => {
        this.status = AgentStatus.Error;
      });
    });
  }

  private handleMessage(data: WebSocket.Data): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(data.toString());
    } catch {
      return; // Ignore malformed messages
    }

    if (isJsonRpcResponse(parsed)) {
      const pending = this.pendingRequests.get(parsed.id);
      if (pending) {
        clearTimeout(pending.timer);
        this.pendingRequests.delete(parsed.id);
        if (parsed.error) {
          pending.reject(parsed.error);
        } else {
          pending.resolve(parsed);
        }
      }
    } else if (isJsonRpcNotification(parsed)) {
      this.eventEmitter.emit("event", parsed as unknown as CodexEvent);
    }
  }
}
