/**
 * Mobile-side E2EE using WebCrypto API.
 *
 * Keys are kept in the same DER formats used by the bridge:
 * - public keys: SPKI
 * - private keys: PKCS8
 *
 * The mobile app stores them as base64url strings so they are compatible
 * with the relay protocol and the bridge's Node.js crypto implementation.
 */

import type { EncryptedPayload } from "@crc/shared";

export interface ClientKeyPair {
  ed25519PublicKey: string;
  ed25519PrivateKey: string;
  x25519PublicKey: string;
  x25519PrivateKey: string;
}

export interface DirectionalSessionKeys {
  bridgeToClient: string;
  clientToBridge: string;
}

export async function generateClientKeyPair(): Promise<ClientKeyPair> {
  const ed25519 = assertCryptoKeyPair(
    await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]),
  );
  const x25519 = assertCryptoKeyPair(
    await crypto.subtle.generateKey({ name: "X25519" }, true, ["deriveBits"]),
  );

  const [ed25519Public, ed25519Private, x25519Public, x25519Private] = await Promise.all([
    crypto.subtle.exportKey("spki", ed25519.publicKey),
    crypto.subtle.exportKey("pkcs8", ed25519.privateKey),
    crypto.subtle.exportKey("spki", x25519.publicKey),
    crypto.subtle.exportKey("pkcs8", x25519.privateKey),
  ]);

  return {
    ed25519PublicKey: encodeBase64Url(ed25519Public),
    ed25519PrivateKey: encodeBase64Url(ed25519Private),
    x25519PublicKey: encodeBase64Url(x25519Public),
    x25519PrivateKey: encodeBase64Url(x25519Private),
  };
}

export async function deriveSharedSecret(
  myPrivateKeyBase64Url: string,
  theirPublicKeyBase64Url: string,
): Promise<ArrayBuffer> {
  const [privateKey, publicKey] = await Promise.all([
    crypto.subtle.importKey(
      "pkcs8",
      decodeBase64Url(myPrivateKeyBase64Url),
      { name: "X25519" },
      false,
      ["deriveBits"],
    ),
    crypto.subtle.importKey(
      "spki",
      decodeBase64Url(theirPublicKeyBase64Url),
      { name: "X25519" },
      false,
      [],
    ),
  ]);

  return crypto.subtle.deriveBits(
    { name: "X25519", public: publicKey },
    privateKey,
    256,
  );
}

export async function deriveAESKeys(
  sharedSecret: ArrayBuffer,
  sessionId: string,
): Promise<{ bridgeToClient: ArrayBuffer; clientToBridge: ArrayBuffer }> {
  const encoder = new TextEncoder();
  const hkdfKey = await crypto.subtle.importKey("raw", sharedSecret, "HKDF", false, ["deriveBits"]);

  const bits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: encoder.encode(sessionId),
      info: encoder.encode("crc-session-keys"),
    },
    hkdfKey,
    512,
  );

  return splitDirectionalKeyBytes(bits);
}

export async function deriveDirectionalSessionKeys(
  sharedSecret: ArrayBuffer,
  sessionId: string,
): Promise<DirectionalSessionKeys> {
  const keys = await deriveAESKeys(sharedSecret, sessionId);
  return {
    bridgeToClient: encodeBase64Url(keys.bridgeToClient),
    clientToBridge: encodeBase64Url(keys.clientToBridge),
  };
}

export async function encryptRelayPayload(
  plaintext: string,
  keyBase64Url: string,
): Promise<EncryptedPayload> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    decodeBase64Url(keyBase64Url),
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );

  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      cryptoKey,
      encoder.encode(plaintext),
    ),
  );

  const tagLength = 16;
  const ciphertext = encrypted.slice(0, encrypted.length - tagLength);
  const tag = encrypted.slice(encrypted.length - tagLength);

  return {
    iv: encodeBase64Url(iv),
    ciphertext: encodeBase64Url(ciphertext),
    tag: encodeBase64Url(tag),
  };
}

export async function decryptRelayPayload(
  payload: EncryptedPayload,
  keyBase64Url: string,
): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    decodeBase64Url(keyBase64Url),
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );

  const iv = new Uint8Array(decodeBase64Url(payload.iv));
  const ciphertext = new Uint8Array(decodeBase64Url(payload.ciphertext));
  const tag = new Uint8Array(decodeBase64Url(payload.tag));
  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext);
  combined.set(tag, ciphertext.length);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    combined,
  );

  return new TextDecoder().decode(decrypted);
}

export async function encryptPayload(plaintext: string, key: ArrayBuffer): Promise<string> {
  const payload = await encryptRelayPayload(plaintext, encodeBase64Url(key));
  return JSON.stringify(payload);
}

export async function decryptPayload(encoded: string, key: ArrayBuffer): Promise<string> {
  return decryptRelayPayload(JSON.parse(encoded) as EncryptedPayload, encodeBase64Url(key));
}

export function encodeBase64Url(input: ArrayBufferLike | Uint8Array): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function decodeBase64Url(value: string): ArrayBuffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function splitDirectionalKeyBytes(bits: ArrayBuffer): {
  bridgeToClient: ArrayBuffer;
  clientToBridge: ArrayBuffer;
} {
  const bytes = new Uint8Array(bits);
  return {
    bridgeToClient: bytes.slice(0, 32).buffer,
    clientToBridge: bytes.slice(32, 64).buffer,
  };
}

function assertCryptoKeyPair(value: CryptoKeyPair | CryptoKey): CryptoKeyPair {
  if ("publicKey" in value && "privateKey" in value) {
    return value;
  }

  throw new Error("Expected a CryptoKeyPair");
}
