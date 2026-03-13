/**
 * Session store managing connection state, pairing info, and lifecycle.
 */
import { create } from "zustand";

/** Possible connection statuses for the session. */
type ConnectionStatus = "disconnected" | "pairing" | "connecting" | "connected";

/**
 * Shape of the session store state and actions.
 * @property isPaired - Whether the client is currently paired with a bridge.
 * @property relayUrl - URL of the relay server, or null if not paired.
 * @property sessionId - Current session identifier.
 * @property bridgeId - Identifier of the paired bridge.
 * @property status - Current connection status.
 * @property error - Last connection error message, or null.
 * @property setStatus - Update the connection status and clear any error.
 * @param status - The new connection status.
 * @property setPaired - Mark the session as paired and store connection details.
 * @param relayUrl - The relay server URL.
 * @param sessionId - The session identifier.
 * @param bridgeId - The bridge identifier.
 * @property setError - Set an error message and revert to disconnected status.
 * @param error - The error message to display.
 * @property disconnect - Reset all session state to defaults.
 */
interface SessionState {
  isPaired: boolean;
  relayUrl: string | null;
  sessionId: string | null;
  bridgeId: string | null;
  status: ConnectionStatus;
  encryptionReady: boolean;
  error: string | null;
  /** @param status - The new connection status. */
  setStatus: (status: ConnectionStatus) => void;
  /** @param relayUrl - The relay server URL. */
  /** @param sessionId - The session identifier. */
  /** @param bridgeId - The bridge identifier. */
  setPaired: (relayUrl: string, sessionId: string, bridgeId: string) => void;
  setEncryptionReady: (ready: boolean) => void;
  /** @param error - The error message to display. */
  setError: (error: string) => void;
  disconnect: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  isPaired: false,
  relayUrl: null,
  sessionId: null,
  bridgeId: null,
  status: "disconnected",
  encryptionReady: false,
  error: null,
  setStatus: (status) => set({ status, error: null }),
  setPaired: (relayUrl, sessionId, bridgeId) =>
    set({ isPaired: true, relayUrl, sessionId, bridgeId, status: "connected", error: null }),
  setEncryptionReady: (encryptionReady) => set({ encryptionReady }),
  setError: (error) => set({ error, status: "disconnected" }),
  disconnect: () =>
    set({
      isPaired: false,
      relayUrl: null,
      sessionId: null,
      bridgeId: null,
      status: "disconnected",
      encryptionReady: false,
      error: null,
    }),
}));
