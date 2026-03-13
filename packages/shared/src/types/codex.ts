/**
 * Codex app-server v2 protocol types.
 *
 * These types model the JSON-RPC methods and events used by OpenAI's
 * Codex app-server when communicating over WebSocket. The bridge uses
 * these to translate between the mobile client and the agent.
 *
 * Note: This is an independent implementation based on the Codex
 * app-server v2 protocol specification. It covers thread management,
 * turn execution, item streaming, approval handling, and model discovery.
 */

// ─── Thread Types ────────────────────────────────────────────────

export type ThreadStatus =
  | "active"
  | "idle"
  | "closed"
  | "archived";

export interface Thread {
  id: string;
  preview: string;
  modelProvider: string;
  createdAt: number;
  updatedAt: number;
  status: ThreadStatus;
  agentNickname?: string;
  agentRole?: string;
}

// ─── Thread Method Params & Responses ────────────────────────────

export interface ThreadStartParams {
  model?: string;
  cwd?: string;
  approvalPolicy?: ApprovalPolicy;
  sandbox?: SandboxConfig;
  personality?: Personality;
  ephemeral?: boolean;
}

export type ApprovalPolicy = "on-request" | "never" | "unlessTrusted";

export interface SandboxConfig {
  type: string;
  writableRoots?: string[];
  networkAccess?: boolean;
}

export type Personality = "friendly" | "pragmatic" | "none";

export interface ThreadResumeParams {
  threadId: string;
}

export interface ThreadListParams {
  cursor?: string | null;
  limit?: number;
  sortKey?: ThreadSortKey;
  archived?: boolean;
  searchTerm?: string;
}

export type ThreadSortKey = "created_at" | "updated_at";

export interface ThreadListResult {
  threads: Thread[];
  nextCursor?: string | null;
}

export interface ThreadReadParams {
  threadId: string;
}

export interface ThreadArchiveParams {
  threadId: string;
  archived: boolean;
}

export interface ThreadNameSetParams {
  threadId: string;
  name: string;
}

export interface ThreadCloseParams {
  threadId: string;
}

// ─── Turn Types ──────────────────────────────────────────────────

export type TurnStatus =
  | "running"
  | "completed"
  | "stopped"
  | "failed"
  | "awaiting-approval";

export interface Turn {
  id: string;
  threadId: string;
  status: TurnStatus;
  startedAt?: number;
  completedAt?: number;
}

export interface TurnStartParams {
  threadId: string;
  input: TurnInputItem[];
  cwd?: string;
  approvalPolicy?: ApprovalPolicy;
  model?: string;
  effort?: ReasoningEffort;
  fastMode?: boolean;
}

export type ReasoningEffort = "low" | "medium" | "high";

export interface TurnInputItem {
  type: "text" | "image";
  text?: string;
  dataUrl?: string;
  mimeType?: string;
}

export interface TurnSteerParams {
  threadId: string;
  turnId: string;
  input: TurnInputItem[];
}

export interface TurnInterruptParams {
  threadId: string;
  turnId: string;
}

// ─── Item Types ──────────────────────────────────────────────────

export type ItemStatus =
  | "in_progress"
  | "completed"
  | "failed"
  | "stopped";

export interface Item {
  id: string;
  threadId: string;
  turnId: string;
  type: ItemType;
  status: ItemStatus;
}

export type ItemType =
  | "agentMessage"
  | "commandExecution"
  | "mcpTool"
  | "approvalRequest";

// ─── Approval Types ──────────────────────────────────────────────

export interface ApprovalRequest {
  threadId: string;
  turnId: string;
  itemId: string;
  type: "commandExecution" | "mcpTool";
  command?: string;
  toolName?: string;
  cwd?: string;
  reason?: string;
  approvalId?: string;
  availableDecisions?: ApprovalDecision[];
}

export type ApprovalDecision =
  | "accept"
  | "acceptForSession"
  | "decline"
  | "cancel";

export interface ApprovalResponseParams {
  threadId: string;
  turnId: string;
  itemId: string;
  approvalId: string;
  decision: ApprovalDecision;
}

// ─── Model Types ─────────────────────────────────────────────────

export interface ModelOption {
  id: string;
  name: string;
  description?: string;
}

export interface ModelListResult {
  models: ModelOption[];
}

// ─── Event Notification Types ────────────────────────────────────

/** Union of all Codex event notifications the bridge forwards to mobile. */
export type CodexEvent =
  | CodexThreadEvent
  | CodexTurnEvent
  | CodexItemEvent
  | CodexTokenUsageEvent;

export type CodexThreadEvent =
  | { method: "thread/started"; params: { thread: Thread } }
  | { method: "thread/closed"; params: { threadId: string } }
  | { method: "thread/archived"; params: { threadId: string; archived: boolean } }
  | { method: "thread/name/set"; params: { threadId: string; name: string } };

export type CodexTurnEvent =
  | { method: "turn/started"; params: { threadId: string; turnId: string } }
  | { method: "turn/completed"; params: { threadId: string; turnId: string; status: TurnStatus } }
  | { method: "turn/interrupted"; params: { threadId: string; turnId: string } };

export type CodexItemEvent =
  | { method: "item/started"; params: { threadId: string; turnId: string; itemId: string; type: ItemType } }
  | { method: "item/completed"; params: { threadId: string; turnId: string; itemId: string; status: ItemStatus } }
  | { method: "item/agentMessage/delta"; params: { threadId: string; delta: string } }
  | { method: "item/commandExecution/output"; params: { threadId: string; turnId: string; itemId: string; output: string } }
  | { method: "item/mcpTool/output"; params: { threadId: string; turnId: string; itemId: string; output: string } }
  | { method: "item/commandExecution/requestApproval"; params: ApprovalRequest }
  | { method: "item/mcpTool/requestApproval"; params: ApprovalRequest };

export interface TokenUsageUpdate {
  threadId: string;
  tokensUsed: number;
  tokenLimit: number;
}

export type CodexTokenUsageEvent =
  | { method: "thread/tokenUsage/updated"; params: TokenUsageUpdate };

// ─── Initialize Types ────────────────────────────────────────────

export interface InitializeParams {
  clientInfo?: {
    name: string;
    version: string;
  };
}

export interface InitializeResult {
  protocolVersion: string;
  capabilities: Record<string, unknown>;
  serverInfo?: {
    name: string;
    version: string;
  };
}

// ─── Method Registry ─────────────────────────────────────────────

/**
 * All Codex app-server v2 methods the bridge handles.
 * Used for routing and validation.
 */
export const CodexMethods = {
  // Lifecycle
  initialize: "initialize",
  initialized: "initialized",

  // Thread management
  threadStart: "thread/start",
  threadResume: "thread/resume",
  threadList: "thread/list",
  threadRead: "thread/read",
  threadArchive: "thread/archive",
  threadNameSet: "thread/name/set",
  threadClose: "thread/close",

  // Turn management
  turnStart: "turn/start",
  turnSteer: "turn/steer",
  turnInterrupt: "turn/interrupt",

  // Approval responses
  approvalRespond: "item/approval/respond",

  // Model discovery
  modelList: "model/list",

  // Context window
  contextWindowRead: "thread/contextWindow/read",
} as const;

/** Type-safe access to all Codex method name strings. */
export type CodexMethod = (typeof CodexMethods)[keyof typeof CodexMethods];
