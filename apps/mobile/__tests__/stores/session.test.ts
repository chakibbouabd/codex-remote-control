import { useSessionStore } from "@/stores/session";
import { act } from "@testing-library/react-native";

beforeEach(() => {
  useSessionStore.setState({
    isPaired: false,
    relayUrl: null,
    sessionId: null,
    bridgeId: null,
    status: "disconnected",
    encryptionReady: false,
    error: null,
  });
});

describe("useSessionStore", () => {
  it("starts with default disconnected state", () => {
    const state = useSessionStore.getState();
    expect(state.isPaired).toBe(false);
    expect(state.relayUrl).toBeNull();
    expect(state.sessionId).toBeNull();
    expect(state.bridgeId).toBeNull();
    expect(state.status).toBe("disconnected");
    expect(state.encryptionReady).toBe(false);
    expect(state.error).toBeNull();
  });

  it("setStatus updates status and clears error", () => {
    useSessionStore.getState().setError("some error");
    expect(useSessionStore.getState().error).toBe("some error");

    act(() => {
      useSessionStore.getState().setStatus("connecting");
    });

    const state = useSessionStore.getState();
    expect(state.status).toBe("connecting");
    expect(state.error).toBeNull();
  });

  it("setPaired sets pairing info and status to connected", () => {
    act(() => {
      useSessionStore
        .getState()
        .setPaired("wss://relay.example.com", "abc123", "mac-001");
    });

    const state = useSessionStore.getState();
    expect(state.isPaired).toBe(true);
    expect(state.relayUrl).toBe("wss://relay.example.com");
    expect(state.sessionId).toBe("abc123");
    expect(state.bridgeId).toBe("mac-001");
    expect(state.status).toBe("connected");
    expect(state.encryptionReady).toBe(false);
    expect(state.error).toBeNull();
  });

  it("setEncryptionReady updates the encryption state", () => {
    act(() => {
      useSessionStore.getState().setEncryptionReady(true);
    });

    expect(useSessionStore.getState().encryptionReady).toBe(true);
  });

  it("setError sets error and sets status to disconnected", () => {
    act(() => {
      useSessionStore.getState().setStatus("connected");
    });
    act(() => {
      useSessionStore.getState().setError("connection failed");
    });

    const state = useSessionStore.getState();
    expect(state.error).toBe("connection failed");
    expect(state.status).toBe("disconnected");
  });

  it("disconnect resets all state to defaults", () => {
    // First pair
    act(() => {
      useSessionStore
        .getState()
        .setPaired("wss://relay.example.com", "abc123", "mac-001");
    });

    expect(useSessionStore.getState().isPaired).toBe(true);

    // Then disconnect
    act(() => {
      useSessionStore.getState().disconnect();
    });

    const state = useSessionStore.getState();
    expect(state.isPaired).toBe(false);
    expect(state.relayUrl).toBeNull();
    expect(state.sessionId).toBeNull();
    expect(state.bridgeId).toBeNull();
    expect(state.status).toBe("disconnected");
    expect(state.encryptionReady).toBe(false);
    expect(state.error).toBeNull();
  });

  it("cycles through all connection statuses", () => {
    const statuses = ["disconnected", "pairing", "connecting", "connected"] as const;

    for (const status of statuses) {
      act(() => {
        useSessionStore.getState().setStatus(status);
      });
      expect(useSessionStore.getState().status).toBe(status);
    }
  });
});
