/**
 * AES-256-GCM encryption/decryption with HKDF-SHA256 key derivation.
 *
 * Key derivation:
 *   HKDF-SHA256(shared_secret, info=salt) → 64 bytes
 *   First 32 bytes → bridge-to-client AES key
 *   Last 32 bytes  → client-to-bridge AES key
 *
 * Encryption:
 *   Each message uses a fresh 12-byte IV (nonce).
 *   AES-256-GCM provides both confidentiality and integrity.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { hkdf } from "node:crypto";

export interface DeriveKeyParams {
  sharedSecret: Buffer;
  sessionId: string;
}

export interface DirectionalKeys {
  bridgeToClient: Buffer;
  clientToBridge: Buffer;
}

/**
 * Derive two directional AES-256 keys from a shared secret using HKDF.
 *
 * Uses the session ID as salt/info for domain separation between sessions.
 * Returns 64 bytes split into two 32-byte keys (one per direction).
 */
export async function deriveDirectionalKeys(params: DeriveKeyParams): Promise<DirectionalKeys> {
  const derived = await new Promise<Buffer>((resolve, reject) => {
    hkdf(
      "sha256",
      params.sharedSecret,
      Buffer.from(params.sessionId, "utf-8"),
      Buffer.from("crc-session-keys", "utf-8"),
      64,
      (err, derivedKey) => {
        if (err) reject(err);
        else resolve(Buffer.from(derivedKey));
      },
    );
  });

  return {
    bridgeToClient: derived.subarray(0, 32),
    clientToBridge: derived.subarray(32, 64),
  };
}

export interface EncryptedData {
  iv: string;       // base64url encoded
  ciphertext: string; // base64url encoded
  tag: string;      // base64url encoded
}

/**
 * Encrypt a plaintext message with AES-256-GCM.
 *
 * @param plaintext - The message to encrypt (as a string)
 * @param key - 32-byte AES key
 * @returns Encrypted data with IV, ciphertext, and auth tag (all base64url)
 */
export function encrypt(plaintext: string, key: Buffer): EncryptedData {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf-8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString("base64url"),
    ciphertext: encrypted.toString("base64url"),
    tag: tag.toString("base64url"),
  };
}

/**
 * Decrypt an AES-256-GCM encrypted message.
 *
 * @param data - Encrypted data with IV, ciphertext, and auth tag
 * @param key - 32-byte AES key
 * @returns Decrypted plaintext string
 * @throws Error if decryption fails (wrong key, tampered data)
 */
export function decrypt(data: EncryptedData, key: Buffer): string {
  const iv = Buffer.from(data.iv, "base64url");
  const ciphertext = Buffer.from(data.ciphertext, "base64url");
  const tag = Buffer.from(data.tag, "base64url");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf-8");
}

/**
 * Convenience: encrypt a string to a JSON-stringified EncryptedData.
 */
export function encryptToJson(plaintext: string, key: Buffer): string {
  return JSON.stringify(encrypt(plaintext, key));
}

/**
 * Convenience: decrypt a JSON-stringified EncryptedData back to plaintext.
 */
export function decryptFromJson(json: string, key: Buffer): string {
  return decrypt(JSON.parse(json), key);
}
