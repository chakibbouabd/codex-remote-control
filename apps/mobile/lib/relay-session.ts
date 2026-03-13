import type {
  EncryptedPayload,
  ErrorPayload,
  RelayMessage,
} from "@crc/shared";
import { type PairingQrData, normalizeRelayUrl, normalizeSessionCode } from "./pairing";
import {
  type ClientKeyPair,
  type DirectionalSessionKeys,
  decryptRelayPayload,
  deriveDirectionalSessionKeys,
  deriveSharedSecret,
  generateClientKeyPair,
} from "./crypto-client";
import { SecureWebSocketClient } from "./websocket-client";
import { useSessionStore } from "@/stores/session";

export interface ActiveRelaySession {
  relayUrl: string;
  sessionId: string;
  bridgeId: string;
  bridgePublicKey: string;
  bridgeKeyExchangePublicKey: string;
  clientId: string;
  clientKeys: ClientKeyPair;
  sessionKeys: DirectionalSessionKeys;
}

type EncryptedRelayMessage = {
  type: "encrypted";
  payload: EncryptedPayload;
};

type PairReadyPayload = {
  role?: string;
  sessionId?: string;
};

class RelaySessionManager {
  private client: SecureWebSocketClient | null = null;
  private snapshot: ActiveRelaySession | null = null;
  private unsubscribeMessage: (() => void) | null = null;
  private unsubscribeState: (() => void) | null = null;

  async pair(qrData: PairingQrData): Promise<ActiveRelaySession> {
    const relayUrl = normalizeRelayUrl(qrData.relay);
    const sessionId = normalizeSessionCode(qrData.sessionId);
    const clientKeys = await generateClientKeyPair();
    const sharedSecret = await deriveSharedSecret(
      clientKeys.x25519PrivateKey,
      qrData.bridgeKeyExchangePublicKey,
    );
    const sessionKeys = await deriveDirectionalSessionKeys(sharedSecret, sessionId);

    const snapshot: ActiveRelaySession = {
      relayUrl,
      sessionId,
      bridgeId: qrData.bridgeId,
      bridgePublicKey: qrData.bridgePublicKey,
      bridgeKeyExchangePublicKey: qrData.bridgeKeyExchangePublicKey,
      clientId: generateId(12),
      clientKeys,
      sessionKeys,
    };

    this.snapshot = snapshot;

    const store = useSessionStore.getState();
    store.setPaired(relayUrl, sessionId, qrData.bridgeId);
    store.setStatus("pairing");
    store.setEncryptionReady(true);

    this.attachClient(snapshot);
    await this.waitForConnected();

    this.client?.send({
      type: "pair.confirm",
      payload: {
        clientId: snapshot.clientId,
        clientPublicKey: snapshot.clientKeys.ed25519PublicKey,
        clientEphemeralKey: snapshot.clientKeys.x25519PublicKey,
      },
    });

    useSessionStore.getState().setStatus("connected");

    return snapshot;
  }

  async reconnect(snapshot: ActiveRelaySession): Promise<void> {
    this.snapshot = snapshot;

    const store = useSessionStore.getState();
    store.setPaired(snapshot.relayUrl, snapshot.sessionId, snapshot.bridgeId);
    store.setStatus("connecting");
    store.setEncryptionReady(true);

    this.attachClient(snapshot);
    await this.waitForConnected();
  }

  disconnect(options: { clearSnapshot?: boolean } = {}): void {
    this.unsubscribeMessage?.();
    this.unsubscribeMessage = null;
    this.unsubscribeState?.();
    this.unsubscribeState = null;
    this.client?.disconnect();
    this.client = null;

    if (options.clearSnapshot !== false) {
      this.snapshot = null;
    }

    useSessionStore.getState().disconnect();
  }

  getSnapshot(): ActiveRelaySession | null {
    return this.snapshot;
  }

  private attachClient(snapshot: ActiveRelaySession): void {
    this.unsubscribeMessage?.();
    this.unsubscribeMessage = null;
    this.unsubscribeState?.();
    this.unsubscribeState = null;
    this.client?.disconnect();

    const client = new SecureWebSocketClient(snapshot.relayUrl, snapshot.sessionId, "client");
    this.client = client;
    this.unsubscribeState = client.onStateChange((state) => {
      const store = useSessionStore.getState();
      if (!store.isPaired) return;

      if (state === "connecting") {
        store.setStatus("connecting");
      } else if (state === "connected") {
        store.setStatus("connected");
      } else {
        store.setStatus("disconnected");
      }
    });
    this.unsubscribeMessage = client.onMessage((message) => {
      void this.handleMessage(message);
    });
    client.connect();
  }

  private async handleMessage(message: RelayMessage): Promise<void> {
    switch (message.type) {
      case "pair.ready":
        this.handlePairReady(message.payload as PairReadyPayload);
        return;
      case "disconnect":
        useSessionStore.getState().setStatus("connecting");
        return;
      case "error":
        this.handleRelayError(message.payload as ErrorPayload);
        return;
      default:
        break;
    }

    if (isEncryptedMessage(message) && this.snapshot) {
      await this.handleEncryptedMessage(message);
    }
  }

  private handlePairReady(_payload: PairReadyPayload): void {
    const store = useSessionStore.getState();
    if (store.isPaired && store.encryptionReady) {
      store.setStatus("connected");
    }
  }

  private handleRelayError(payload: ErrorPayload): void {
    useSessionStore.getState().setError(payload.message);
  }

  private async handleEncryptedMessage(message: EncryptedRelayMessage): Promise<void> {
    if (!this.snapshot) return;

    try {
      await decryptRelayPayload(
        message.payload,
        this.snapshot.sessionKeys.bridgeToClient,
      );
    } catch {
      useSessionStore.getState().setError("Failed to decrypt message from the bridge.");
    }
  }

  private waitForConnected(timeoutMs = 5000): Promise<void> {
    if (this.client?.getState() === "connected") {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        unsubscribe();
        reject(new Error("Timed out connecting to the relay."));
      }, timeoutMs);

      const unsubscribe = this.client?.onStateChange((state) => {
        if (state === "connected") {
          clearTimeout(timer);
          unsubscribe?.();
          resolve();
        }
      });
    });
  }
}

export const relaySessionManager = new RelaySessionManager();

function generateId(length: number): string {
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let result = "";

  for (const byte of bytes) {
    result += alphabet[byte % alphabet.length];
  }

  return result;
}

function isEncryptedMessage(message: RelayMessage): message is EncryptedRelayMessage {
  return message.type === "encrypted" && typeof message.payload === "object" && message.payload !== null;
}
