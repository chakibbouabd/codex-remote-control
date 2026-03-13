/**
 * Cryptographic keypair generation and management.
 *
 * Uses Node.js built-in crypto module for:
 * - Ed25519: long-term identity keys (signing, verification)
 * - X25519: ephemeral key exchange keys (ECDH)
 *
 * All keys are stored as raw bytes (not DER-encoded) for direct use
 * with Node.js crypto.sign/crypto.verify and crypto.diffieHellman.
 * Serialization uses base64url for transport and storage.
 */

import {
  generateKeyPairSync,
  createPrivateKey,
  createPublicKey,
  sign,
  verify,
} from "node:crypto";

export interface RawKeyPair {
  publicKey: Buffer;
  privateKey: Buffer;
}

export interface SerializedKeyPair {
  publicKey: string;
  privateKey: string;
}

/**
 * Generate an Ed25519 keypair for identity verification.
 * Keys are exported in raw format for use with crypto.sign/crypto.verify.
 */
export function generateEd25519KeyPair(): RawKeyPair {
  const kp = generateKeyPairSync("ed25519");
  return {
    publicKey: kp.publicKey.export({ type: "spki", format: "der" }),
    privateKey: kp.privateKey.export({ type: "pkcs8", format: "der" }),
  };
}

/**
 * Generate an X25519 keypair for key exchange (ECDH).
 * Keys are exported in DER format for use with createPrivateKey/createPublicKey.
 */
export function generateX25519KeyPair(): RawKeyPair {
  const kp = generateKeyPairSync("x25519");
  return {
    publicKey: kp.publicKey.export({ type: "spki", format: "der" }),
    privateKey: kp.privateKey.export({ type: "pkcs8", format: "der" }),
  };
}

/**
 * Generate both Ed25519 identity and X25519 ephemeral keypairs.
 */
export function generateIdentityKeys(): {
  ed25519: RawKeyPair;
  x25519: RawKeyPair;
} {
  return {
    ed25519: generateEd25519KeyPair(),
    x25519: generateX25519KeyPair(),
  };
}

/**
 * Convert a raw keypair to base64url strings for transport/storage.
 */
export function serializeKeyPair(pair: RawKeyPair): SerializedKeyPair {
  return {
    publicKey: pair.publicKey.toString("base64url"),
    privateKey: pair.privateKey.toString("base64url"),
  };
}

/**
 * Convert base64url strings back to raw Buffer keypair.
 */
export function deserializeKeyPair(serialized: SerializedKeyPair): RawKeyPair {
  return {
    publicKey: Buffer.from(serialized.publicKey, "base64url"),
    privateKey: Buffer.from(serialized.privateKey, "base64url"),
  };
}

/**
 * Sign a message with an Ed25519 private key.
 * Returns the signature as a base64url string.
 */
export function signEd25519(
  message: Buffer,
  derPrivateKey: Buffer,
): string {
  const key = createPrivateKey({
    key: derPrivateKey,
    format: "der",
    type: "pkcs8",
  });
  const signature = sign(null, message, key);
  return Buffer.from(signature).toString("base64url");
}

/**
 * Verify an Ed25519 signature against a message and public key.
 *
 * Uses the 4-argument form: verify(algorithm, data, key, signature).
 * Returns false if verification fails for any reason (tampered message,
 * wrong key, malformed signature).
 */
export function verifyEd25519(
  message: Buffer,
  signatureBuffer: Buffer,
  derPublicKey: Buffer,
): boolean {
  try {
    const key = createPublicKey({
      key: derPublicKey,
      format: "der",
      type: "spki",
    });
    // Node.js verify() 4-arg form: verify(algo, data, key, signature)
    return verify(null, message, key, signatureBuffer);
  } catch {
    return false;
  }
}
