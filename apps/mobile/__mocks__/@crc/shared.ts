/**
 * Manual mock for @crc/shared.
 * The websocket-client only imports type RelayMessage and function isEncryptedRelayMessage.
 * We provide a mock implementation that Jest can resolve in the pnpm monorepo.
 */

export function isEncryptedRelayMessage(_msg: unknown): boolean {
  return true;
}

export type RelayMessage =
  | { type: "heartbeat"; payload: { timestamp: number } }
  | { type: "pair.request"; payload: Record<string, string> }
  | { type: "pair.confirm"; payload: Record<string, string> }
  | { type: "agent.event"; payload: Record<string, string> }
  | { type: "agent.response"; payload: Record<string, string> }
  | { type: "encrypted"; payload: Record<string, string> };
