import { useEffect, useRef, useCallback } from "react";
import { SecureWebSocketClient } from "@/lib/websocket-client";
import { useSessionStore } from "@/stores/session";

export function useRelayConnection() {
  const clientRef = useRef<SecureWebSocketClient | null>(null);
  const { relayUrl, sessionId, setPaired, setStatus } = useSessionStore();

  const connect = useCallback(() => {
    if (!relayUrl || !sessionId) return;
    clientRef.current = new SecureWebSocketClient(relayUrl, sessionId);
    clientRef.current.connect();
    setStatus("connected");
  }, [relayUrl, sessionId, setStatus]);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
    clientRef.current = null;
    useSessionStore.getState().disconnect();
  }, []);

  const send = useCallback((message: any) => {
    clientRef.current?.send(message);
  }, []);

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
