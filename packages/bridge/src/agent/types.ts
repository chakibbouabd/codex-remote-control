/**
 * Agent adapter interface for multi-agent support.
 *
 * Each AI coding agent (Codex, Aider, etc.) implements this interface.
 * The bridge uses the adapter to spawn the agent, send JSON-RPC requests,
 * receive events, and manage the agent lifecycle.
 */

import type { JsonRpcRequest, JsonRpcResponse } from "@crc/shared";
import type { CodexEvent } from "@crc/shared";

export interface AgentConfig {
  /** Working directory for the agent. */
  cwd: string;
  /** Model identifier (e.g., "o4-mini"). */
  model?: string;
  /** Approval policy: when to ask for user confirmation. */
  approvalPolicy?: "on-request" | "never" | "unlessTrusted";
  /** Agent-specific configuration. */
  extra?: Record<string, unknown>;
}

export enum AgentStatus {
  Idle = "idle",
  Starting = "starting",
  Running = "running",
  Stopping = "stopping",
  Stopped = "stopped",
  Error = "error",
}

export interface AgentAdapter {
  /** Unique identifier for this adapter type (e.g., "codex-v2"). */
  readonly adapterId: string;

  /**
   * Spawn the agent process or connect to its server.
   * Resolves when the agent is ready to receive requests.
   */
  start(config: AgentConfig): Promise<void>;

  /**
   * Send a JSON-RPC request to the agent and wait for the response.
   * Rejects if the agent returns an error or times out.
   */
  sendRequest<T = unknown>(request: JsonRpcRequest): Promise<JsonRpcResponse<T>>;

  /**
   * Subscribe to agent events (JSON-RPC notifications).
   * The handler receives parsed event notifications from the agent.
   * Returns an unsubscribe function.
   */
  onEvent(handler: (event: CodexEvent) => void): () => void;

  /**
   * Gracefully stop the agent process.
   * Resolves when the agent has shut down.
   */
  stop(): Promise<void>;

  /** Get the current agent status. */
  getStatus(): AgentStatus;
}
