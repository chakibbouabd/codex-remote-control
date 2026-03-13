export { SecureWebSocketClient } from "./websocket-client";
export { relaySessionManager } from "./relay-session";
export { getDatabase } from "./database";
export {
  saveThread,
  saveThreads,
  loadThreads,
  archiveThread,
  deleteThread,
  saveMessage,
  loadMessages,
  clearMessages,
} from "./storage";
export {
  generateClientKeyPair,
  encryptPayload,
  decryptPayload,
  deriveSharedSecret,
  deriveAESKeys,
  deriveDirectionalSessionKeys,
  encryptRelayPayload,
  decryptRelayPayload,
  encodeBase64Url,
  decodeBase64Url,
} from "./crypto-client";
export type { ClientKeyPair } from "./crypto-client";
export {
  normalizeRelayUrl,
  normalizeSessionCode,
  parsePairingQrPayload,
} from "./pairing";
export type { PairingQrData } from "./pairing";
