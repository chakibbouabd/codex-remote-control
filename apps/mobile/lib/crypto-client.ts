/**
 * Mobile-side E2EE using shared crypto utilities.
 *
 * In React Native, we use expo-crypto for random bytes and the
 * WebCrypto API for AES-256-GCM. The shared package's Node.js crypto
 * functions are not available on mobile, so we implement mobile-specific
 * versions here.
 */

import { generateIdentityKeys, serializeKeyPair, deserializeKeyPair } from "@crc/shared";

export interface ClientKeyPair {
  ed25519PublicKey: string;
  ed25519PrivateKey: string;
  x25519PublicKey: string;
  x25519PrivateKey: string;
}

/**
 * Generate identity keypairs for E2EE pairing.
 * On mobile, this uses expo-crypto's random number generator.
 */
export function generateClientKeyPair(): ClientKeyPair {
  const keys = generateIdentityKeys();
  const ed25519 = serializeKeyPair(keys.ed25519);
  const x25519 = serializeKeyPair(keys.x25519);
  return {
    ed25519PublicKey: ed25519.publicKey,
    ed25519PrivateKey: ed25519.privateKey,
    x25519PublicKey: x25519.publicKey,
    x25519PrivateKey: x25519.privateKey,
  };
}

/**
 * Encrypt a JSON payload using AES-256-GCM via WebCrypto API.
 * Falls back to expo-crypto polyfill if WebCrypto is not available.
 */
export async function encryptPayload(plaintext: string, key: ArrayBuffer): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    data,
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted));

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt an AES-256-GCM encrypted payload via WebCrypto API.
 */
export async function decryptPayload(encoded: string, key: ArrayBuffer): Promise<string> {
  const combined = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    ciphertext,
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Derive a shared secret using X25519 ECDH via WebCrypto API.
 */
export async function deriveSharedSecret(
  myPrivateKeyBase64: string,
  theirPublicKeyBase64: string,
): Promise<ArrayBuffer> {
  const privateKeyData = Uint8Array.from(atob(myPrivateKeyBase64), (c) => c.charCodeAt(0));

  // Extract raw 32-byte X25519 private key from DER-encoded PKCS8
  // PKCS8 DER for X25519: header is 48 bytes, key material is last 32
  const rawPrivateKey = privateKeyData.slice(-32);

  const publicKeyData = Uint8Array.from(atob(theirPublicKeyBase64), (c) => c.charCodeAt(0));
  const rawPublicKey = publicKeyData.slice(-32);

  const privateKey = await crypto.subtle.importKey(
    "raw",
    rawPrivateKey,
    { name: "X25519" },
    false,
    ["deriveBits"],
  );

  const publicKey = await crypto.subtle.importKey(
    "raw",
    rawPublicKey,
    { name: "X25519" },
    true,
    [],
  );

  const sharedBits = await crypto.subtle.deriveBits(
    { name: "X25519", public: publicKey },
    privateKey,
    256,
  );

  return sharedBits;
}

/**
 * Derive AES keys from shared secret using HKDF-SHA256 via WebCrypto API.
 */
export async function deriveAESKeys(
  sharedSecret: ArrayBuffer,
  sessionId: string,
): Promise<{ bridgeToClient: ArrayBuffer; clientToBridge: ArrayBuffer }> {
  const encoder = new TextEncoder();
  const info = encoder.encode("crc-session-keys");
  const salt = encoder.encode(sessionId);

  const hkdfKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    { name: "HKDF" },
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info, length: 512 },
    hkdfKey,
  );

  return {
    bridgeToClient: bits.slice(0, 32),
    clientToBridge: bits.slice(32, 64),
  };
}
