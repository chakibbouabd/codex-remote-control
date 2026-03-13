/**
 * JSON-RPC 2.0 base types.
 *
 * CRC communicates with AI agents using JSON-RPC 2.0 over WebSocket.
 * These types define the base protocol envelope used for all requests,
 * responses, and notifications between bridge and agent.
 *
 * @see https://www.jsonrpc.org/specification
 */

/** JSON-RPC 2.0 Request — sent from client to server. */
export interface JsonRpcRequest<T = unknown> {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: T;
}

/** JSON-RPC 2.0 Response — sent from server to client in reply to a request. */
export interface JsonRpcResponse<T = unknown> {
  jsonrpc: "2.0";
  id: number | string;
  result?: T;
  error?: JsonRpcError;
}

/** JSON-RPC 2.0 Notification — sent from server to client without an id. */
export interface JsonRpcNotification<T = unknown> {
  jsonrpc: "2.0";
  method: string;
  params?: T;
}

/** JSON-RPC 2.0 Error object. */
export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

/** Standard JSON-RPC error codes. */
export const JsonRpcErrorCode = {
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,
} as const;

/** Type guard: checks if a parsed JSON value is a JsonRpcRequest. */
export function isJsonRpcRequest(value: unknown): value is JsonRpcRequest {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    obj.jsonrpc === "2.0" &&
    typeof obj.method === "string" &&
    (typeof obj.id === "string" || typeof obj.id === "number")
  );
}

/** Type guard: checks if a parsed JSON value is a JsonRpcResponse. */
export function isJsonRpcResponse(value: unknown): value is JsonRpcResponse {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    obj.jsonrpc === "2.0" &&
    (typeof obj.id === "string" || typeof obj.id === "number") &&
    ("result" in obj || "error" in obj)
  );
}

/** Type guard: checks if a parsed JSON value is a JsonRpcNotification. */
export function isJsonRpcNotification(
  value: unknown,
): value is JsonRpcNotification {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    obj.jsonrpc === "2.0" &&
    typeof obj.method === "string" &&
    !("id" in obj)
  );
}

/** Type guard: checks if a value is a JsonRpcError. */
export function isJsonRpcError(value: unknown): value is JsonRpcError {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.code === "number" && typeof obj.message === "string"
  );
}
