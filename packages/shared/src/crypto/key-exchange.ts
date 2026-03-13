/**
 * X25519 ECDH key exchange.
 *
 * Two parties each generate an X25519 keypair and exchange public keys.
 * Both then compute the same shared secret using ECDH:
 *   shared_secret = X25519(my_private_key, their_public_key)
 */

import { diffieHellman, createPrivateKey, createPublicKey } from "node:crypto";

/**
 * Compute a shared secret from a private key and peer's public key.
 * Both parties computing this with their own private + other's public
 * will arrive at the same shared secret (a 32-byte Buffer).
 */
export function computeSharedSecret(
  myPrivateKey: Buffer,
  theirPublicKey: Buffer,
): Buffer {
  const privKey = createPrivateKey({
    key: myPrivateKey,
    format: "der",
    type: "pkcs8",
  });
  const pubKey = createPublicKey({
    key: theirPublicKey,
    format: "der",
    type: "spki",
  });

  // diffieHellman returns the raw shared secret as a Buffer
  const sharedSecret = diffieHellman({ privateKey: privKey, publicKey: pubKey });
  return Buffer.from(sharedSecret);
}

/**
 * Compute the bridge-to-client shared secret.
 */
export function computeBridgeSharedSecret(
  bridgePrivateKey: Buffer,
  clientPublicKey: Buffer,
): Buffer {
  return computeSharedSecret(bridgePrivateKey, clientPublicKey);
}

/**
 * Compute the client-to-bridge shared secret (same result).
 */
export function computeClientSharedSecret(
  clientPrivateKey: Buffer,
  bridgePublicKey: Buffer,
): Buffer {
  return computeSharedSecret(clientPrivateKey, bridgePublicKey);
}
