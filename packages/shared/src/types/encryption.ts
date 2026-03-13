/**
 * Encryption type definitions for CRC end-to-end encryption.
 *
 * CRC uses X25519 for key exchange, Ed25519 for identity verification,
 * and AES-256-GCM for message encryption. Keys are derived via HKDF-SHA256.
 */

/** Base64-encoded keypair. */
export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

/** Device identity keys for signing and key exchange. */
export interface IdentityKeys {
  ed25519: KeyPair;
  x25519: KeyPair;
}

/** Derived session encryption keys (directional). */
export interface SessionKeys {
  /** Key for encrypting messages from bridge to mobile. */
  bridgeToClient: Buffer;
  /** Key for encrypting messages from mobile to bridge. */
  clientToBridge: Buffer;
  /** Session identifier. */
  sessionId: string;
  /** Key epoch for forward secrecy rotation. */
  keyEpoch: number;
}

/** State of the E2EE session. */
export type EncryptionState =
  | "uninitialized"
  | "handshake"
  | "ready"
  | "error";

/** Encrypted envelope with replay protection counter. */
export interface EncryptedEnvelope {
  keyEpoch: number;
  counter: number;
  iv: string;
  ciphertext: string;
  tag: string;
}

/** QR code pairing data embedded in the QR displayed by the bridge. */
export interface QrPairingData {
  /** Version of the pairing protocol. */
  v: number;
  /** Relay URL to connect to. */
  relay: string;
  /** Session code for pairing. */
  sessionId: string;
  /** Bridge device identifier. */
  bridgeId: string;
  /** Bridge Ed25519 public key (base64). */
  bridgePublicKey: string;
  /** Bridge X25519 public key (base64url DER) for key exchange. */
  bridgeKeyExchangePublicKey: string;
  /** Expiry timestamp (Unix ms). */
  expiresAt: number;
}

/** Protocol version for pairing QR codes. */
export const PAIRING_PROTOCOL_VERSION = 1;
