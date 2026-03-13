/**
 * `crc pair` command — display QR code for pairing.
 *
 * Generates pairing data and displays a QR code for the mobile app.
 */

import type { Command } from "commander";
import qrcode from "qrcode-terminal";
import {
  generateIdentityKeys,
  serializeKeyPair,
  generateSessionCode,
  generateId,
  now,
  QR_EXPIRY_MS,
} from "@crc/shared";

const DEFAULT_RELAY_URL = process.env.CRC_RELAY || "wss://relay.codex-remote.control";

export function registerPairCommand(program: Command): void {
  program
    .command("pair")
    .description("Generate a QR code for pairing with the mobile app")
    .option("--relay <url>", "Relay server URL", DEFAULT_RELAY_URL)
    .action((options: { relay: string }) => {
      const keys = generateIdentityKeys();
      const sessionId = generateSessionCode();
      const serialized = serializeKeyPair(keys.ed25519);

      const qrData = {
        v: 1,
        relay: options.relay,
        sessionId,
        bridgeId: generateId(12),
        bridgePublicKey: serialized.publicKey,
        expiresAt: now() + QR_EXPIRY_MS,
      };

      console.log("\nCRC Pairing");
      console.log("\nRelay: " + options.relay);
      console.log("Session: " + sessionId);
      const expiryMinutes = Math.round(QR_EXPIRY_MS / 60000);
      console.log("Expires in " + expiryMinutes + " minutes");
      console.log("\nScan this QR code with the CRC mobile app:\n");

      qrcode.generate(JSON.stringify(qrData), { small: true }, (qr: string) => {
        console.log(qr);
      });

      console.log("\nBridge public key: " + serialized.publicKey.slice(0, 20) + "...");
    });
}
