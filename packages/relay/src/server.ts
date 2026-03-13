/**
 * CRC Relay Server.
 *
 * A lightweight WebSocket relay that pairs one bridge (Mac) with one
 * mobile client per session. Forwards encrypted messages between them
 * without decrypting or inspecting payloads.
 *
 * Usage:
 *   crc-relay                    # Start on default port 3773
 *   CRC_RELAY_PORT=8080 crc-relay  # Custom port
 *
 * Endpoints:
 *   GET /health  - Health check (returns session count)
 *   WS /         - WebSocket endpoint for bridge and mobile clients
 */

import { createServer, IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { loadRelayConfig, type RelayConfig } from "./config.js";
import { ClientRegistry } from "./client-registry.js";
import { MessageForwarder } from "./message-forwarder.js";
import { HeartbeatMonitor } from "./heartbeat.js";
import { SESSION_CODE_LENGTH } from "@crc/shared";

function createRelayServer(config?: Partial<RelayConfig>) {
  const cfg = { ...loadRelayConfig(), ...config };
  const registry = new ClientRegistry();
  const forwarder = new MessageForwarder(registry);
  const monitor = new HeartbeatMonitor(registry, cfg);

  // Create HTTP server for health check
  const httpServer = createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        sessions: registry.activeSessionCount,
        uptime: process.uptime(),
      }),
    );
  });

  // Create WebSocket server
  const wss = new WebSocketServer({ server: httpServer });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    // Extract session ID from URL query params or path
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const sessionId = (
      url.searchParams.get("sessionId") ||
      url.pathname.replace(/^\//, "") ||
      ""
    ).toUpperCase();

    const role = url.searchParams.get("role") || "client"; // "bridge" or "client"

    // Validate session ID format
    if (sessionId.length !== SESSION_CODE_LENGTH || !/^[A-Z0-9]+$/.test(sessionId)) {
      ws.send(
        JSON.stringify({
          type: "error",
          payload: {
            code: "INVALID_SESSION",
            message: "Session ID must be a 6-character alphanumeric code",
          },
        }),
      );
      ws.close(4001, "invalid_session");
      return;
    }

    // Get or create session with the requested ID
    const session = registry.getOrCreateSession(sessionId);

    // Register the socket
    if (role === "bridge") {
      if (session.bridge) {
        ws.send(
          JSON.stringify({
            type: "error",
            payload: { code: "ALREADY_PAIRED", message: "Bridge already connected" },
          }),
        );
        ws.close(4002, "already_paired");
        return;
      }
      registry.pairBridge(sessionId, ws);
    } else {
      if (session.client) {
        ws.send(
          JSON.stringify({
            type: "error",
            payload: { code: "ALREADY_PAIRED", message: "Client already connected" },
          }),
        );
        ws.close(4002, "already_paired");
        return;
      }
      registry.pairClient(sessionId, ws);
    }

    // Notify the other party
    const paired = role === "bridge" ? session.client : session.bridge;
    if (paired && paired.readyState === 1) {
      paired.send(
        JSON.stringify({
          type: "pair.ready",
          payload: { role, sessionId },
        }),
      );
    }

    // Handle incoming messages
    ws.on("message", (raw: Buffer) => {
      forwarder.handleMessage(ws, raw.toString());
    });

    // Handle disconnect
    ws.on("close", () => {
      const remaining = registry.removeSocket(ws);
      if (remaining) {
        // Notify the other party
        const other = role === "bridge" ? remaining.client : remaining.bridge;
        if (other && other.readyState === 1) {
          other.send(
            JSON.stringify({
              type: "disconnect",
              payload: { role, sessionId },
            }),
          );
        }
      }
    });
  });

  // Graceful shutdown
  const shutdown = (exit = true) => {
    monitor.stop();
    // Close all sessions
    for (const session of registry.getAllSessions()) {
      registry.closeSession(session.sessionId);
    }
    wss.close(() => {
      httpServer.close();
      if (exit) process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  return {
    httpServer,
    wss,
    registry,
    start: () => {
      monitor.start();
      return new Promise<void>((resolve) => {
        httpServer.listen(cfg.port, cfg.host, () => {
          console.log(`crc-relay listening on ${cfg.host}:${cfg.port}`);
          resolve();
        });
      });
    },
    stop: shutdown,
  };
}

// Run directly when executed as CLI
const isMainModule =
  process.argv[1] && !process.argv[1].includes("node_modules");

if (isMainModule) {
  const relay = createRelayServer();
  relay.start();
}

export { createRelayServer };
