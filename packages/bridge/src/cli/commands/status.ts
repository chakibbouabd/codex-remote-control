/**
 * @module cli/commands/status
 *
 * `crc status` command -- show bridge connection and session status.
 *
 * Displays the detected workspace info, last active session details,
 * and current relay configuration.
 */

import type { Command } from "commander";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { detectWorkspace } from "../../workspace/scanner.js";

const CRC_STATE_DIR = join(process.env.HOME || "/tmp", ".crc");

export function registerStatusCommand(program: Command): void {
  program
    .command("status")
    .description("Show current bridge connection and session status")
    .action(() => {
      console.log("\nCRC Bridge Status\n");

      // Workspace info
      const ws = detectWorkspace(process.cwd());
      console.log("Workspace: " + ws.name);
      console.log("   Path: " + ws.root);
      console.log("   Git: " + (ws.isGitRepo ? "yes" : "no"));
      if (ws.githubSlug) {
        console.log("   GitHub: " + ws.githubSlug);
      }

      // Check for active session
      const sessionFile = join(CRC_STATE_DIR, "last-session.json");
      if (existsSync(sessionFile)) {
        try {
          const session = JSON.parse(readFileSync(sessionFile, "utf-8"));
          console.log("\nLast session:");
          console.log("   Session ID: " + (session.sessionId || "unknown"));
          console.log("   Connected: " + (session.connected ? "yes" : "no"));
          if (session.connectedAt) {
            console.log("   Since: " + new Date(session.connectedAt).toLocaleString());
          }
        } catch {
          console.log("\nSession file found but could not be read.");
        }
      } else {
        console.log("\nNo active session found.");
        console.log("   Run 'crc start' to begin a new session.");
      }

      // Config
      const relay = process.env.CRC_RELAY || "wss://relay.codex-remote.control";
      console.log("\nConfiguration:");
      console.log("   Relay: " + relay);
      console.log("   State dir: " + CRC_STATE_DIR);
      console.log("");
    });
}
