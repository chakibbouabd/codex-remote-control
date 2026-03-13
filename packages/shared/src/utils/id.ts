/**
 * Unique ID generation utilities for CRC.
 *
 * Uses a lightweight alphanumeric ID generation approach
 * suitable for session codes, message IDs, and device identifiers.
 */

const ALPHANUMERIC = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Generate a random alphanumeric ID of the given length.
 *
 * @param length - Number of characters (default: 21, same as nanoid standard)
 * @returns Random alphanumeric string
 */
export function generateId(length = 21): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let id = "";
  for (let i = 0; i < length; i++) {
    id += ALPHANUMERIC[bytes[i] % ALPHANUMERIC.length];
  }
  return id;
}

/**
 * Generate a short session code (uppercase alphanumeric).
 *
 * @param length - Number of characters (default: 6)
 * @returns Short uppercase session code like "A3K9X2"
 */
export function generateSessionCode(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHANUMERIC[bytes[i] % ALPHANUMERIC.length];
  }
  return code;
}
