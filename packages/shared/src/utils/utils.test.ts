import { describe, it, expect } from "vitest";
import { generateId, generateSessionCode } from "./id.js";
import { relativeTime, isExpired, isoNow, fromMs } from "./timestamp.js";

describe("generateId", () => {
  it("generates a 21-character ID by default", () => {
    const id = generateId();
    expect(id).toHaveLength(21);
  });

  it("generates IDs of custom length", () => {
    expect(generateId(8)).toHaveLength(8);
    expect(generateId(32)).toHaveLength(32);
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });

  it("only contains alphanumeric characters", () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9A-Z]+$/);
  });
});

describe("generateSessionCode", () => {
  it("generates a 6-character code by default", () => {
    const code = generateSessionCode();
    expect(code).toHaveLength(6);
  });

  it("generates unique codes", () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateSessionCode()));
    expect(codes.size).toBe(100);
  });
});

describe("relativeTime", () => {
  it("returns 'just now' for recent timestamps", () => {
    expect(relativeTime(Date.now())).toBe("just now");
  });

  it("returns minutes for timestamps under an hour", () => {
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    expect(relativeTime(fiveMinAgo)).toBe("5m ago");
  });

  it("returns hours for timestamps under a day", () => {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    expect(relativeTime(twoHoursAgo)).toBe("2h ago");
  });
});

describe("isExpired", () => {
  it("returns false for timestamps within the window", () => {
    expect(isExpired(Date.now(), 60_000)).toBe(false);
  });

  it("returns true for timestamps past the window", () => {
    expect(isExpired(Date.now() - 120_000, 60_000)).toBe(true);
  });
});

describe("isoNow", () => {
  it("returns a valid ISO-8601 string", () => {
    const iso = isoNow();
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe("fromMs", () => {
  it("creates a Date from milliseconds", () => {
    const ms = 1_700_000_000_000;
    const date = fromMs(ms);
    expect(date.getTime()).toBe(ms);
  });
});
