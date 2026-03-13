#!/usr/bin/env node
/**
 * CRC — Codex Remote Control bridge CLI.
 *
 * Usage:
 *   crc start [workspace-path]   Start the bridge
 *   crc pair                     Display QR code for pairing
 *   crc status                   Show connection status
 */

import { Command } from "commander";
import { registerStartCommand } from "./commands/start.js";
import { registerPairCommand } from "./commands/pair.js";
import { registerStatusCommand } from "./commands/status.js";

const program = new Command();

program
  .name("crc")
  .description("Codex Remote Control bridge — control AI coding agents from your phone")
  .version("0.1.0");

registerStartCommand(program);
registerPairCommand(program);
registerStatusCommand(program);

program.parse();
