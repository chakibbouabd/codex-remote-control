/**
 * Mobile-side E2EE using pure-JS crypto.
 *
 * Keys are kept in the same DER formats used by the bridge:
 * - public keys: SPKI
 * - private keys: PKCS8
 *
 * The mobile app stores them as base64url strings so they are compatible
 * with the relay protocol and the bridge's Node.js crypto implementation.
 */

import { gcm } from "@noble/ciphers/aes.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import type { EncryptedPayload } from "@crc/shared";
import { getRandomBytes } from "expo-crypto";
import nacl from "tweetnacl";

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

const DER_PREFIX = {
  ed25519Public: Uint8Array.from([0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00]),
  ed25519Private: Uint8Array.from([0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20]),
  x25519Public: Uint8Array.from([0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x6e, 0x03, 0x21, 0x00]),
  x25519Private: Uint8Array.from([0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x6e, 0x04, 0x22, 0x04, 0x20]),
} as const;

configureNaclPrng();

export async function generateClientKeyPair(): Promise<ClientKeyPair> {
  const ed25519 = nacl.sign.keyPair();
  const x25519 = nacl.box.keyPair();

  return {
    ed25519PublicKey: encodeBase64Url(wrapDer(DER_PREFIX.ed25519Public, ed25519.publicKey)),
    ed25519PrivateKey: encodeBase64Url(wrapDer(DER_PREFIX.ed25519Private, ed25519.secretKey.slice(0, 32))),
    x25519PublicKey: encodeBase64Url(wrapDer(DER_PREFIX.x25519Public, x25519.publicKey)),
    x25519PrivateKey: encodeBase64Url(wrapDer(DER_PREFIX.x25519Private, x25519.secretKey)),
  };
}

export async function deriveSharedSecret(
  myPrivateKeyBase64Url: string,
  theirPublicKeyBase64Url: string,
): Promise<ArrayBuffer> {
  const privateKey = unwrapDer(DER_PREFIX.x25519Private, new Uint8Array(decodeBase64Url(myPrivateKeyBase64Url)));
  const publicKey = unwrapDer(DER_PREFIX.x25519Public, new Uint8Array(decodeBase64Url(theirPublicKeyBase64Url)));
  const sharedSecret = nacl.scalarMult(privateKey, publicKey);
  return sharedSecret.buffer.slice(
    sharedSecret.byteOffset,
    sharedSecret.byteOffset + sharedSecret.byteLength,
  );
}

export async function deriveAESKeys(
  sharedSecret: ArrayBuffer,
  sessionId: string,
): Promise<{ bridgeToClient: ArrayBuffer; clientToBridge: ArrayBuffer }> {
  const bits = hkdf(
    sha256,
    new Uint8Array(sharedSecret),
    new TextEncoder().encode(sessionId),
    new TextEncoder().encode("crc-session-keys"),
    64,
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
  const iv = getRandomBytes(12);
  const encrypted = gcm(
    new Uint8Array(decodeBase64Url(keyBase64Url)),
    iv,
  ).encrypt(new TextEncoder().encode(plaintext));

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
  const iv = new Uint8Array(decodeBase64Url(payload.iv));
  const ciphertext = new Uint8Array(decodeBase64Url(payload.ciphertext));
  const tag = new Uint8Array(decodeBase64Url(payload.tag));
  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext);
  combined.set(tag, ciphertext.length);

  const decrypted = gcm(
    new Uint8Array(decodeBase64Url(keyBase64Url)),
    iv,
  ).decrypt(combined);

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

function splitDirectionalKeyBytes(bits: Uint8Array): {
  bridgeToClient: ArrayBuffer;
  clientToBridge: ArrayBuffer;
} {
  return {
    bridgeToClient: bits.slice(0, 32).buffer,
    clientToBridge: bits.slice(32, 64).buffer,
  };
}

function wrapDer(prefix: Uint8Array, rawKey: Uint8Array): Uint8Array {
  const output = new Uint8Array(prefix.length + rawKey.length);
  output.set(prefix, 0);
  output.set(rawKey, prefix.length);
  return output;
}

function unwrapDer(prefix: Uint8Array, derKey: Uint8Array): Uint8Array {
  if (derKey.length < prefix.length + 32) {
    throw new Error("Invalid DER key length");
  }

  for (let i = 0; i < prefix.length; i++) {
    if (derKey[i] !== prefix[i]) {
      throw new Error("Unsupported DER key format");
    }
  }

  return derKey.slice(prefix.length, prefix.length + 32);
}

function configureNaclPrng(): void {
  nacl.setPRNG((target, length) => {
    const randomBytes = getRandomBytes(length);
    for (let i = 0; i < length; i++) {
      target[i] = randomBytes[i];
    }
  });
}
