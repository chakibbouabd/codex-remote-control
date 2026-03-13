/**
 * Hook providing relay WebSocket connection lifecycle management.
 * @returns An object with connect, disconnect, send, and onMessage helpers.
 */
import { useEffect, useRef, useCallback } from "react";
import { SecureWebSocketClient } from "@/lib/websocket-client";
import { useSessionStore } from "@/stores/session";

export function useRelayConnection() {
  const clientRef = useRef<SecureWebSocketClient | null>(null);
  const { relayUrl, sessionId, setPaired, setStatus } = useSessionStore();

  /** Open a WebSocket connection to the relay server. */
  const connect = useCallback(() => {
    if (!relayUrl || !sessionId) return;
    clientRef.current = new SecureWebSocketClient(relayUrl, sessionId);
    clientRef.current.connect();
    setStatus("connected");
  }, [relayUrl, sessionId, setStatus]);

  /** Close the WebSocket connection and reset session state. */
  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
    clientRef.current = null;
    useSessionStore.getState().disconnect();
  }, []);

  /** Send a message through the active WebSocket connection. */
  const send = useCallback((message: any) => {
    clientRef.current?.send(message);
  }, []);

  /** Register a handler for incoming WebSocket messages. */
  const onMessage = useCallback((handler: any) => {
    return clientRef.current?.onMessage(handler) ?? (() => {});
  }, []);

  useEffect(() => {
    return () => {
      clientRef.current?.disconnect();
    };
  }, []);

  return { connect, disconnect, send, onMessage };
}
