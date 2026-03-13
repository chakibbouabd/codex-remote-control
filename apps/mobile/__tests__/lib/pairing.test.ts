import {
  normalizeRelayUrl,
  normalizeSessionCode,
  parsePairingQrPayload,
} from "@/lib/pairing";

describe("pairing helpers", () => {
  it("normalizes relay URLs and session codes", () => {
    expect(normalizeRelayUrl("  ws://127.0.0.1:3773  ")).toBe("ws://127.0.0.1:3773");
    expect(normalizeSessionCode(" ab12cd ")).toBe("AB12CD");
  });

  it("parses and normalizes QR payloads", () => {
    expect(
      parsePairingQrPayload(JSON.stringify({
        v: 1,
        relay: " ws://127.0.0.1:3773 ",
        sessionId: "ab12cd",
        bridgeId: "bridge-1",
        bridgePublicKey: "pub",
        expiresAt: 123456,
      })),
    ).toEqual({
      v: 1,
      relay: "ws://127.0.0.1:3773",
      sessionId: "AB12CD",
      bridgeId: "bridge-1",
      bridgePublicKey: "pub",
      expiresAt: 123456,
    });
  });

  it("rejects invalid QR payloads", () => {
    expect(() => parsePairingQrPayload("not json")).toThrow("QR payload must be valid JSON");
    expect(() => parsePairingQrPayload(JSON.stringify({ v: 1 }))).toThrow(
      "QR payload is missing required pairing fields",
    );
  });
});
