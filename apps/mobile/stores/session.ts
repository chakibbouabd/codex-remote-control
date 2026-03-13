import { create } from "zustand";

type ConnectionStatus = "disconnected" | "pairing" | "connecting" | "connected";

interface SessionState {
  isPaired: boolean;
  relayUrl: string | null;
  sessionId: string | null;
  bridgeId: string | null;
  status: ConnectionStatus;
  error: string | null;
  setStatus: (status: ConnectionStatus) => void;
  setPaired: (relayUrl: string, sessionId: string, bridgeId: string) => void;
  setError: (error: string) => void;
  disconnect: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  isPaired: false,
  relayUrl: null,
  sessionId: null,
  bridgeId: null,
  status: "disconnected",
  error: null,
  setStatus: (status) => set({ status, error: null }),
  setPaired: (relayUrl, sessionId, bridgeId) =>
    set({ isPaired: true, relayUrl, sessionId, bridgeId, status: "connected", error: null }),
  setError: (error) => set({ error, status: "disconnected" }),
  disconnect: () =>
    set({ isPaired: false, relayUrl: null, sessionId: null, bridgeId: null, status: "disconnected", error: null }),
}));
