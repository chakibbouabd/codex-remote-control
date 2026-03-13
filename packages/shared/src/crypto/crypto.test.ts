import { describe, it, expect } from "vitest";
import {
  generateEd25519KeyPair,
  generateX25519KeyPair,
  generateIdentityKeys,
  serializeKeyPair,
  deserializeKeyPair,
  signEd25519,
  verifyEd25519,
} from "./keypair.js";
import { computeSharedSecret } from "./key-exchange.js";
import {
  deriveDirectionalKeys,
  encrypt,
  decrypt,
  encryptToJson,
  decryptFromJson,
} from "./encryption.js";

// ─── Keypair Generation ───────────────────────────────────────────

describe("Keypair generation", () => {
  it("generates Ed25519 keypairs", () => {
    const kp = generateEd25519KeyPair();
    expect(kp.publicKey).toBeInstanceOf(Buffer);
    expect(kp.privateKey).toBeInstanceOf(Buffer);
    // DER-encoded keys have specific lengths
    expect(kp.publicKey.length).toBeGreaterThan(0);
    expect(kp.privateKey.length).toBeGreaterThan(0);
  });

  it("generates X25519 keypairs", () => {
    const kp = generateX25519KeyPair();
    expect(kp.publicKey).toBeInstanceOf(Buffer);
    expect(kp.privateKey).toBeInstanceOf(Buffer);
    expect(kp.publicKey.length).toBeGreaterThan(0);
    expect(kp.privateKey.length).toBeGreaterThan(0);
  });

  it("generates unique keypairs each time", () => {
    const a = generateEd25519KeyPair();
    const b = generateEd25519KeyPair();
    expect(a.publicKey.equals(b.publicKey)).toBe(false);
  });

  it("generates full identity keypair set", () => {
    const keys = generateIdentityKeys();
    expect(keys.ed25519.publicKey).toBeInstanceOf(Buffer);
    expect(keys.ed25519.privateKey).toBeInstanceOf(Buffer);
    expect(keys.x25519.publicKey).toBeInstanceOf(Buffer);
    expect(keys.x25519.privateKey).toBeInstanceOf(Buffer);
  });
});

describe("Keypair serialization", () => {
  it("round-trips Ed25519 keypair through base64url", () => {
    const original = generateEd25519KeyPair();
    const serialized = serializeKeyPair(original);
    expect(typeof serialized.publicKey).toBe("string");
    expect(typeof serialized.privateKey).toBe("string");

    const restored = deserializeKeyPair(serialized);
    expect(restored.publicKey.equals(original.publicKey)).toBe(true);
    expect(restored.privateKey.equals(original.privateKey)).toBe(true);
  });

  it("round-trips X25519 keypair through base64url", () => {
    const original = generateX25519KeyPair();
    const serialized = serializeKeyPair(original);
    const restored = deserializeKeyPair(serialized);
    expect(restored.publicKey.equals(original.publicKey)).toBe(true);
    expect(restored.privateKey.equals(original.privateKey)).toBe(true);
  });
});

describe("Ed25519 signing and verification", () => {
  it("signs and verifies a message", () => {
    const kp = generateEd25519KeyPair();
    const message = Buffer.from("hello world");

    const signature = signEd25519(message, kp.privateKey);
    expect(typeof signature).toBe("string");

    const signatureBuf = Buffer.from(signature, "base64url");
    expect(verifyEd25519(message, signatureBuf, kp.publicKey)).toBe(true);
  });

  it("rejects tampered messages", () => {
    const kp = generateEd25519KeyPair();
    const message = Buffer.from("hello world");
    const signature = signEd25519(message, kp.privateKey);
    const signatureBuf = Buffer.from(signature, "base64url");

    const tampered = Buffer.from("hello world!");
    expect(verifyEd25519(tampered, signatureBuf, kp.publicKey)).toBe(false);
  });

  it("rejects wrong public key", () => {
    const kp1 = generateEd25519KeyPair();
    const kp2 = generateEd25519KeyPair();
    const message = Buffer.from("hello world");
    const signature = signEd25519(message, kp1.privateKey);
    const signatureBuf = Buffer.from(signature, "base64url");

    expect(verifyEd25519(message, signatureBuf, kp2.publicKey)).toBe(false);
  });
});

// ─── Key Exchange ────────────────────────────────────────────────

describe("X25519 key exchange (ECDH)", () => {
  it("produces the same shared secret from both sides", () => {
    const alice = generateX25519KeyPair();
    const bob = generateX25519KeyPair();

    const aliceShared = computeSharedSecret(alice.privateKey, bob.publicKey);
    const bobShared = computeSharedSecret(bob.privateKey, alice.publicKey);

    expect(aliceShared.equals(bobShared)).toBe(true);
  });

  it("produces different shared secrets for different keypairs", () => {
    const alice = generateX25519KeyPair();
    const bob1 = generateX25519KeyPair();
    const bob2 = generateX25519KeyPair();

    const shared1 = computeSharedSecret(alice.privateKey, bob1.publicKey);
    const shared2 = computeSharedSecret(alice.privateKey, bob2.publicKey);

    expect(shared1.equals(shared2)).toBe(false);
  });

  it("produces a 32-byte shared secret", () => {
    const alice = generateX25519KeyPair();
    const bob = generateX25519KeyPair();
    const shared = computeSharedSecret(alice.privateKey, bob.publicKey);
    expect(shared.length).toBe(32);
  });
});

// ─── Encryption ──────────────────────────────────────────────────

describe("AES-256-GCM encryption", () => {
  it("encrypts and decrypts a message", async () => {
    const alice = generateX25519KeyPair();
    const bob = generateX25519KeyPair();
    const shared = computeSharedSecret(alice.privateKey, bob.publicKey);

    const keys = await deriveDirectionalKeys({
      sharedSecret: shared,
      sessionId: "test-session",
    });

    const plaintext = "Hello, this is a secret message!";
    const encrypted = encrypt(plaintext, keys.bridgeToClient);
    const decrypted = decrypt(encrypted, keys.bridgeToClient);

    expect(decrypted).toBe(plaintext);
  });

  it("uses directional keys correctly", async () => {
    const alice = generateX25519KeyPair();
    const bob = generateX25519KeyPair();
    const shared = computeSharedSecret(alice.privateKey, bob.publicKey);

    const keys = await deriveDirectionalKeys({
      sharedSecret: shared,
      sessionId: "test-session",
    });

    // Encrypt with bridge→client key
    const plaintext = "From bridge to client";
    const encrypted = encrypt(plaintext, keys.bridgeToClient);

    // Should decrypt with bridge→client key
    expect(decrypt(encrypted, keys.bridgeToClient)).toBe(plaintext);

    // Should fail with client→bridge key (wrong key)
    expect(() => decrypt(encrypted, keys.clientToBridge)).toThrow();
  });

  it("rejects tampered ciphertext", async () => {
    const alice = generateX25519KeyPair();
    const bob = generateX25519KeyPair();
    const shared = computeSharedSecret(alice.privateKey, bob.publicKey);

    const keys = await deriveDirectionalKeys({
      sharedSecret: shared,
      sessionId: "test-session",
    });

    const encrypted = encrypt("secret", keys.bridgeToClient);
    // Tamper with the ciphertext
    encrypted.ciphertext = "AAAA" + encrypted.ciphertext.slice(4);

    expect(() => decrypt(encrypted, keys.bridgeToClient)).toThrow();
  });

  it("rejects tampered auth tag", async () => {
    const alice = generateX25519KeyPair();
    const bob = generateX25519KeyPair();
    const shared = computeSharedSecret(alice.privateKey, bob.publicKey);

    const keys = await deriveDirectionalKeys({
      sharedSecret: shared,
      sessionId: "test-session",
    });

    const encrypted = encrypt("secret", keys.bridgeToClient);
    encrypted.tag = "AAAA" + encrypted.tag.slice(4);

    expect(() => decrypt(encrypted, keys.bridgeToClient)).toThrow();
  });

  it("uses fresh IV for each encryption", async () => {
    const keys = await deriveDirectionalKeys({
      sharedSecret: Buffer.alloc(32, 1),
      sessionId: "test",
    });

    const e1 = encrypt("hello", keys.bridgeToClient);
    const e2 = encrypt("hello", keys.bridgeToClient);

    // Same plaintext but different IVs → different ciphertext
    expect(e1.iv).not.toBe(e2.iv);
    expect(e1.ciphertext).not.toBe(e2.ciphertext);
  });

  it("handles empty messages", async () => {
    const keys = await deriveDirectionalKeys({
      sharedSecret: Buffer.alloc(32, 1),
      sessionId: "test",
    });

    const encrypted = encrypt("", keys.bridgeToClient);
    expect(decrypt(encrypted, keys.bridgeToClient)).toBe("");
  });

  it("handles unicode messages", async () => {
    const keys = await deriveDirectionalKeys({
      sharedSecret: Buffer.alloc(32, 1),
      sessionId: "test",
    });

    const unicode = "Hello 🌍 مرحبا 日本語";
    const encrypted = encrypt(unicode, keys.bridgeToClient);
    expect(decrypt(encrypted, keys.bridgeToClient)).toBe(unicode);
  });

  it("derives different keys for different session IDs", async () => {
    const shared = Buffer.alloc(32, 42);

    const keys1 = await deriveDirectionalKeys({ sharedSecret: shared, sessionId: "session-A" });
    const keys2 = await deriveDirectionalKeys({ sharedSecret: shared, sessionId: "session-B" });

    expect(keys1.bridgeToClient.equals(keys2.bridgeToClient)).toBe(false);
    expect(keys1.clientToBridge.equals(keys2.clientToBridge)).toBe(false);
  });

  it("produces 32-byte directional keys", async () => {
    const keys = await deriveDirectionalKeys({
      sharedSecret: Buffer.alloc(32, 1),
      sessionId: "test",
    });

    expect(keys.bridgeToClient.length).toBe(32);
    expect(keys.clientToBridge.length).toBe(32);
  });
});

describe("JSON convenience methods", () => {
  it("encrypts to JSON and decrypts back", async () => {
    const keys = await deriveDirectionalKeys({
      sharedSecret: Buffer.alloc(32, 1),
      sessionId: "test",
    });

    const json = encryptToJson("hello world", keys.bridgeToClient);
    expect(typeof json).toBe("string");
    expect(JSON.parse(json)).toHaveProperty("iv");
    expect(JSON.parse(json)).toHaveProperty("ciphertext");
    expect(JSON.parse(json)).toHaveProperty("tag");

    expect(decryptFromJson(json, keys.bridgeToClient)).toBe("hello world");
  });
});

// ─── Full E2EE Roundtrip ─────────────────────────────────────────

describe("Full E2EE roundtrip", () => {
  it("bridge and mobile can exchange encrypted messages", async () => {
    const bridgeIdentity = generateIdentityKeys();
    const mobileIdentity = generateIdentityKeys();

    const shared = computeSharedSecret(
      bridgeIdentity.x25519.privateKey,
      mobileIdentity.x25519.publicKey,
    );

    const keys = await deriveDirectionalKeys({
      sharedSecret: shared,
      sessionId: "ABC123",
    });

    // Bridge sends to mobile
    const bridgeMsg = encrypt("Hello from bridge", keys.bridgeToClient);
    expect(decrypt(bridgeMsg, keys.bridgeToClient)).toBe("Hello from bridge");

    // Mobile sends to bridge
    const mobileMsg = encrypt("Hello from mobile", keys.clientToBridge);
    expect(decrypt(mobileMsg, keys.clientToBridge)).toBe("Hello from mobile");

    // Cross-direction fails
    expect(() => decrypt(bridgeMsg, keys.clientToBridge)).toThrow();
    expect(() => decrypt(mobileMsg, keys.bridgeToClient)).toThrow();
  });

  it("handles a real JSON-RPC message roundtrip", async () => {
    const alice = generateX25519KeyPair();
    const bob = generateX25519KeyPair();
    const shared = computeSharedSecret(alice.privateKey, bob.publicKey);
    const keys = await deriveDirectionalKeys({ sharedSecret: shared, sessionId: "session-1" });

    const rpcRequest = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "turn/start",
      params: { threadId: "abc", input: [{ type: "text", text: "Fix the bug" }] },
    });

    const encrypted = encrypt(rpcRequest, keys.bridgeToClient);
    const decrypted = decrypt(encrypted, keys.bridgeToClient);
    const parsed = JSON.parse(decrypted);

    expect(parsed.method).toBe("turn/start");
    expect(parsed.params.input[0].text).toBe("Fix the bug");
  });
});
