/**
 * Timestamp utility functions for CRC.
 */

/**
 * Get the current Unix timestamp in milliseconds.
 */
export function now(): number {
  return Date.now();
}

/**
 * Get an ISO-8601 formatted UTC timestamp string.
 */
export function isoNow(): string {
  return new Date().toISOString();
}

/**
 * Create a Date from a Unix timestamp in milliseconds.
 */
export function fromMs(ms: number): Date {
  return new Date(ms);
}

/**
 * Format a relative time string (e.g., "2m ago", "1h ago").
 */
export function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/**
 * Check if a timestamp has expired.
 */
export function isExpired(ms: number, expiryMs: number): boolean {
  return Date.now() > ms + expiryMs;
}
