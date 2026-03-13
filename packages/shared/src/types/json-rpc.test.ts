import { describe, it, expect } from "vitest";
import {
  isJsonRpcRequest,
  isJsonRpcResponse,
  isJsonRpcNotification,
  isJsonRpcError,
  JsonRpcErrorCode,
} from "./json-rpc.js";

describe("JsonRpcRequest", () => {
  it("identifies a valid request", () => {
    const req = { jsonrpc: "2.0", id: 1, method: "test" };
    expect(isJsonRpcRequest(req)).toBe(true);
  });

  it("rejects a notification (no id)", () => {
    const notif = { jsonrpc: "2.0", method: "test" };
    expect(isJsonRpcRequest(notif)).toBe(false);
  });

  it("rejects non-objects", () => {
    expect(isJsonRpcRequest(null)).toBe(false);
    expect(isJsonRpcRequest("string")).toBe(false);
    expect(isJsonRpcRequest(42)).toBe(false);
  });

  it("rejects wrong jsonrpc version", () => {
    const req = { jsonrpc: "1.0", id: 1, method: "test" };
    expect(isJsonRpcRequest(req)).toBe(false);
  });
});

describe("JsonRpcResponse", () => {
  it("identifies a successful response", () => {
    const res = { jsonrpc: "2.0", id: 1, result: { ok: true } };
    expect(isJsonRpcResponse(res)).toBe(true);
  });

  it("identifies an error response", () => {
    const res = { jsonrpc: "2.0", id: 1, error: { code: -32600, message: "bad" } };
    expect(isJsonRpcResponse(res)).toBe(true);
  });
});

describe("JsonRpcNotification", () => {
  it("identifies a notification (has method, no id)", () => {
    const notif = { jsonrpc: "2.0", method: "event/started", params: {} };
    expect(isJsonRpcNotification(notif)).toBe(true);
  });

  it("rejects a request (has id)", () => {
    const req = { jsonrpc: "2.0", id: 1, method: "test" };
    expect(isJsonRpcNotification(req)).toBe(false);
  });
});

describe("JsonRpcError", () => {
  it("identifies a valid error", () => {
    const err = { code: JsonRpcErrorCode.InvalidParams, message: "bad params" };
    expect(isJsonRpcError(err)).toBe(true);
  });
});

describe("JsonRpcErrorCode", () => {
  it("has standard error codes", () => {
    expect(JsonRpcErrorCode.ParseError).toBe(-32700);
    expect(JsonRpcErrorCode.InvalidRequest).toBe(-32600);
    expect(JsonRpcErrorCode.MethodNotFound).toBe(-32601);
    expect(JsonRpcErrorCode.InvalidParams).toBe(-32602);
    expect(JsonRpcErrorCode.InternalError).toBe(-32603);
  });
});
