/**
 * `crc start` command — start the bridge.
 *
 * Detects the workspace, spawns the agent, connects to the relay,
 * generates QR pairing data, and begins bridging messages.
 */

import { resolve } from "node:path";
import type { Command } from "commander";
import qrcode from "qrcode-terminal";
import { QR_EXPIRY_MS } from "@crc/shared";
import { CodexAdapter } from "../../agent/codex-adapter.js";
import { MessageRouter } from "../../core/message-router.js";
import { detectWorkspace } from "../../workspace/scanner.js";

const DEFAULT_RELAY_URL = process.env.CRC_RELAY || "wss://relay.codex-remote.control";

interface StartOptions {
  workspace?: string;
  relay?: string;
  session?: string;
}

export function registerStartCommand(program: Command): void {
  program
    .command("start [workspace-path]")
    .description("Start the CRC bridge and display pairing QR code")
    .option("--relay <url>", "Relay server URL", DEFAULT_RELAY_URL)
    .option("--session <id>", "Custom session ID")
    .action(async (workspacePath: string | undefined, options: StartOptions) => {
      const cwd = workspacePath ? resolve(workspacePath) : process.cwd();

      // Detect workspace
      const ws = detectWorkspace(cwd);
      console.log("\nWorkspace: " + ws.name);
      console.log("   Path: " + ws.root);
      if (ws.remoteUrl) {
        console.log("   Remote: " + ws.remoteUrl);
      }
      if (ws.githubSlug) {
        console.log("   GitHub: " + ws.githubSlug);
      }

      // Create agent and router
      const agent = new CodexAdapter();
      const router = new MessageRouter(agent, {
        relayUrl: options.relay,
        cwd: ws.root,
        sessionId: options.session,
      });

      // Generate pairing info
      const pairing = router.generatePairingInfo();
      console.log("\nSession: " + router.getSessionId());

      // Display QR code
      const qrPayload = JSON.stringify(pairing.qrData);
      console.log("\nScan this QR code with the CRC mobile app:\n");
      qrcode.generate(qrPayload, { small: true }, (qr: string) => {
        console.log(qr);
      });

      // Display pairing details
      const expiryMinutes = Math.round(QR_EXPIRY_MS / 60000);
      console.log("\nQR expires in " + expiryMinutes + " minutes");
      console.log("Relay: " + options.relay);
      console.log("\nBridge is running. Waiting for mobile to pair...\n");

      // Handle pairing
      router.on("pairConfirm", (payload: any) => {
        console.log("Mobile device pairing...");
        router.completePairing(payload.clientPublicKey, payload.clientEphemeralKey)
          .then(() => {
            console.log("E2EE encryption established!");
            console.log("Messages are now end-to-end encrypted.\n");
          })
          .catch((err) => {
            console.error("Pairing failed:", err.message);
          });
      });

      router.on("paired", () => {
        console.log("Ready -- you can now send prompts from your phone.\n");
      });

      router.on("message", (_msg: any) => {
        // Forward encrypted messages from mobile to agent are handled internally
      });

      // Start the router (connects to relay + spawns agent)
      try {
        await router.start();
      } catch (err: any) {
        console.error("\nFailed to start bridge: " + err.message);
        console.error("\nMake sure 'codex' is installed: npm install -g @openai/codex");
        await router.stop();
        process.exit(1);
      }

      // Graceful shutdown
      const shutdown = async () => {
        console.log("\nShutting down bridge...");
        await router.stop();
        console.log("Goodbye!");
        process.exit(0);
      };

      process.on("SIGINT", shutdown);
      process.on("SIGTERM", shutdown);
    });
}
