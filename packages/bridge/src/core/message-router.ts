/**
 * Message router — central orchestrator for the CRC bridge.
 *
 * Wires the AI agent adapter and relay client together, handling:
 * - Agent events → encrypt → relay (to mobile)
 * - Relay messages → decrypt → agent (from mobile)
 * - Local commands (git, workspace) → execute → encrypt → relay
 * - E2EE pairing handshake
 */

import { EventEmitter } from "node:events";
import type { AgentAdapter } from "../agent/types.js";
import { RelayClient } from "./relay-client.js";
import {
  type JsonRpcRequest,
  type JsonRpcResponse,
  type CodexEvent,
  type EncryptedData,
  type RawKeyPair,
  type RelayMessage,
  isJsonRpcRequest,
  isEncryptedRelayMessage,
  computeSharedSecret,
  deriveDirectionalKeys,
  encrypt,
  decrypt,
  generateIdentityKeys,
  serializeKeyPair,
  deserializeKeyPair,
  signEd25519,
  verifyEd25519,
  generateSessionCode,
  generateId,
  now,
  QR_EXPIRY_MS,
  PAIRING_PROTOCOL_VERSION,
} from "@crc/shared";

export interface MessageRouterConfig {
  /** WebSocket URL of the relay server. */
  relayUrl: string;
  /** Session code for pairing (auto-generated if not provided). */
  sessionId?: string;
  /** Working directory. */
  cwd: string;
}

export interface PairingInfo {
  /** QR code pairing data for display. */
  qrData: {
    v: number;
    relay: string;
    sessionId: string;
    bridgeId: string;
    bridgePublicKey: string;
    bridgeKeyExchangePublicKey: string;
    expiresAt: number;
  };
  /** Bridge identity public keys (for verification). */
  bridgeIdentityKeys: {
    ed25519PublicKey: string;
    x25519PublicKey: string;
  };
}

type EncryptionKey = Buffer | null;

export class MessageRouter extends EventEmitter {
  private agent: AgentAdapter;
  private relayClient: RelayClient;
  private config: MessageRouterConfig;
  
  // E2EE state
  private identityKeys: { ed25519: RawKeyPair; x25519: RawKeyPair } | null = null;
  private sessionId: string;
  private directionalKeys: { bridgeToClient: Buffer; clientToBridge: Buffer } | null = null;
  private isPaired = false;
  
  // Event cleanup
  private unsubscribers: (() => void)[] = [];

  constructor(agent: AgentAdapter, config: MessageRouterConfig) {
    super();
    this.agent = agent;
    this.config = config;
    this.sessionId = config.sessionId || generateSessionCode();
    this.relayClient = new RelayClient(config.relayUrl, this.sessionId);
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getRelayClient(): RelayClient {
    return this.relayClient;
  }

  /**
   * Generate pairing data and display QR code.
   * Call this after start() to begin the pairing process.
   */
  generatePairingInfo(): PairingInfo {
    this.identityKeys = generateIdentityKeys();
    const serializedEd = serializeKeyPair(this.identityKeys.ed25519);
    const serializedX = serializeKeyPair(this.identityKeys.x25519);

    const qrData = {
      v: PAIRING_PROTOCOL_VERSION,
      relay: this.config.relayUrl,
      sessionId: this.sessionId,
      bridgeId: generateId(12),
      bridgePublicKey: serializedEd.publicKey,
      bridgeKeyExchangePublicKey: serializedX.publicKey,
      expiresAt: now() + QR_EXPIRY_MS,
    };

    return {
      qrData,
      bridgeIdentityKeys: {
        ed25519PublicKey: serializedEd.publicKey,
        x25519PublicKey: serializedX.publicKey,
      },
    };
  }

  /**
   * Complete the E2EE pairing handshake after receiving the client's public keys.
   */
  async completePairing(clientPublicKey: string, clientEphemeralKey: string): Promise<void> {
    if (!this.identityKeys) throw new Error("Identity keys not generated");

    // Deserialize client's X25519 public key
    const clientXPub = {
      publicKey: Buffer.from(clientEphemeralKey, "base64url"),
      privateKey: Buffer.alloc(0), // We only have the public key
    };

    // Compute shared secret
    const sharedSecret = computeSharedSecret(
      this.identityKeys.x25519.privateKey,
      clientXPub.publicKey,
    );

    // Derive directional keys
    this.directionalKeys = await deriveDirectionalKeys({
      sharedSecret,
      sessionId: this.sessionId,
    });

    this.isPaired = true;
    this.emit("paired");
  }

  /**
   * Start the router: connect to relay, start agent, wire message flow.
   */
  async start(): Promise<void> {
    // Connect to relay
    this.relayClient.connect();
    
    // Wire relay → agent (mobile → bridge → agent)
    this.relayClient.on("message", (msg) => {
      this.handleRelayMessage(msg);
    });
    this.relayClient.on("pairConfirm", (payload) => {
      this.emit("pairConfirm", payload);
    });

    // Wire agent → relay (agent → bridge → mobile)
    const unsubAgent = this.agent.onEvent((event) => {
      this.sendToMobile(event);
    });
    this.unsubscribers.push(unsubAgent);

    // Start the agent
    await this.agent.start({
      cwd: this.config.cwd,
    });

    this.emit("started");
  }

  /**
   * Handle incoming message from the relay (originating from mobile).
   */
  private handleRelayMessage(message: RelayMessage): void {
    if (!this.isPaired || !this.directionalKeys) {
      // Not yet paired — ignore encrypted messages
      return;
    }

    if (isEncryptedRelayMessage(message)) {
      try {
        const decrypted = decrypt(message.payload, this.directionalKeys.clientToBridge);
        const parsed = JSON.parse(decrypted);
        
        if (isJsonRpcRequest(parsed)) {
          // Forward to agent
          this.agent.sendRequest(parsed).then((response) => {
            this.sendToMobile(response);
          }).catch((err) => {
            // Send error response back
            this.sendToMobile({
              jsonrpc: "2.0",
              id: parsed.id,
              error: { code: -32603, message: err.message || "Internal error" },
            });
          });
        }
      } catch {
        // Decryption failed — ignore (possibly wrong key or malformed)
      }
    }
  }

  /**
   * Encrypt and send data to the mobile client through the relay.
   */
  sendToMobile(data: unknown): void {
    if (!this.isPaired || !this.directionalKeys) return;
    
    const plaintext = JSON.stringify(data);
    const encrypted = encrypt(plaintext, this.directionalKeys.bridgeToClient);
    
    this.relayClient.send({
      type: "encrypted",
      payload: encrypted,
    });
  }

  /**
   * Stop the router and clean up all resources.
   */
  async stop(): Promise<void> {
    // Unsubscribe from agent events
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];

    // Disconnect relay
    this.relayClient.disconnect();

    // Stop agent
    await this.agent.stop();

    this.isPaired = false;
    this.directionalKeys = null;
    this.emit("stopped");
  }

  isConnected(): boolean {
    return this.relayClient.getState() === "connected" || 
           this.relayClient.getState() === "paired";
  }

  isEncryptionReady(): boolean {
    return this.isPaired && this.directionalKeys !== null;
  }
}
