<p align="center">
  <strong>🚀 CRC — Codex Remote Control</strong><br/>
  Local-first bridge + cross-platform mobile app for controlling AI coding agents from your phone
</p>

---

CRC is a local-first system that lets you control AI coding agents (starting with OpenAI Codex) remotely from your phone. The Mac bridge spawns your agent, connects to an end-to-end encrypted relay, and your phone becomes a remote control for coding sessions — send prompts, review diffs, manage git, and steer active turns.

```
📱 Phone (Expo app) ←E2E encrypted→ Relay Server ←E2E encrypted→ Mac Bridge ←JSON-RPC→ AI Agent
```

## Features

- **Remote coding** — Send prompts, receive streaming responses, view markdown
- **E2E encryption** — X25519 key exchange + AES-256-GCM for all messages
- **Git operations** — Commit, push, pull, branch management from your phone
- **Plan mode** — Structured planning before execution
- **Queue & steer** — Queue follow-up prompts, inject mid-turn to redirect
- **Real-time streaming** — See assistant responses as they arrive
- **Code review** — Diff viewer, change summaries, per-file approval
- **Cross-platform** — iOS, Android, and web from one Expo codebase
- **Multi-agent ready** — Adapter pattern for Codex, Aider, and more

## Architecture

```
codex-remote-control/
├── apps/
│   └── mobile/          # Expo React Native (iOS + Android + Web)
│       ├── app/            # Expo Router file-based routes
│       ├── components/     # UI components (ui, conversation, git, thread)
│       ├── hooks/          # Custom React hooks (relay, pairing)
│       ├── stores/         # Zustand state (session, threads, conversation)
│       ├── lib/            # WebSocket client, crypto, SQLite storage
│       └── constants/      # Theme colors, spacing, layout
├── packages/
│   ├── shared/          # Shared types, protocol definitions, crypto
│   ├── relay/           # WebSocket relay server (self-hostable)
│   └── bridge/          # Mac CLI bridge (npm: codex-remote-control)
│       ├── src/cli/        # Commander CLI: crc start | pair | status
│       ├── src/agent/      # AgentAdapter interface + Codex adapter
│       ├── src/core/       # Message router, relay client
│       ├── src/git/        # Git operation wrappers
│       └── src/workspace/  # Workspace detection
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

### Monorepo Packages

| Package | CLI | Description |
|---------|-----|-------------|
| `@crc/shared` | — | JSON-RPC types, relay protocol, E2EE crypto primitives |
| `@crc/relay` | `crc-relay` | WebSocket relay server, pairs bridge ↔ mobile, forwards encrypted messages |
| `@crc/bridge` | `crc` | Mac CLI, spawns AI agents, handles git/E2EE, bridges to mobile |
| `@crc/mobile` | — | Expo React Native app with conversation UI, git actions, QR pairing |

### Security

- **E2E encryption**: X25519 key exchange → HKDF-SHA256 → AES-256-GCM
- **Identity verification**: Ed25519 signatures on handshake messages
- **Local execution**: Agent, git, and all file operations run on Mac; relay never sees content
- **Directional keys**: Independent AES keys per direction prevents key confusion
- **Replay protection**: Monotonic counters on encrypted envelopes

## Quick Start

### 1. Start the relay server

Self-host the relay or use the default:

```bash
npx @crc/relay
# crc-relay listening on 0.0.0.0:3000
```

### 2. Start the bridge on your Mac

```bash
npm install -g codex-remote-control
crc start
```

This spawns the Codex agent, connects to the relay, and displays a QR code.

### 3. Pair your phone

1. Install the CRC mobile app
2. Scan the QR code displayed in your terminal
3. E2E encryption is established automatically

### 4. Code from your phone

Open a thread, type a prompt, and watch the streaming response in real-time.

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CRC_RELAY` | `wss://relay.codex-remote.control` | Relay server WebSocket URL |
| `CODEX_HOME` | `~/.codex` | Codex data directory |

### CLI Commands

```
crc start [workspace-path]   Start the bridge and display pairing QR code
crc pair                     Display QR code for pairing (standalone)
crc status                   Show connection and session status
```

### CLI Options

```
crc start --relay <url>       Use a custom relay server
crc start --session <id>      Use a custom session code
```

## Development

### Setup

```bash
git clone https://github.com/your-username/codex-remote-control.git
cd codex-remote-control
pnpm install
pnpm build
pnpm test
```

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm build` | Build all packages (Turborepo) |
| `pnpm dev` | Watch mode for all packages |
| `pnpm test` | Run Vitest across all packages |
| `pnpm lint` | Lint all TypeScript packages |
| `pnpm typecheck` | TypeScript type checking |

### Tech Stack

| Component | Technology |
|-----------|-----------|
| Monorepo | pnpm workspaces + Turborepo |
| Bridge & Relay | TypeScript (strict, ESM) |
| Build | tsup (esbuild) |
| Mobile | Expo SDK 55 + Expo Router + React Native |
| State | Zustand |
| Storage | expo-sqlite + expo-secure-store |
| Crypto | Node.js crypto (bridge) + WebCrypto (mobile) |
| Agent | Adapter pattern (AgentAdapter interface) |
| Testing | Vitest |

## Extending

### Adding a new AI agent

Implement the `AgentAdapter` interface:

```typescript
import type { AgentAdapter, AgentConfig } from "@crc/bridge";

export class MyAgentAdapter implements AgentAdapter {
  readonly adapterId = "my-agent";

  async start(config: AgentConfig): Promise<void> { /* ... */ }
  async sendRequest<T>(request: JsonRpcRequest): Promise<JsonRpcResponse<T>> { /* ... */ }
  onEvent(handler: (event: CodexEvent) => void): () => void { /* ... */ }
  async stop(): Promise<void> { /* ... */ }
  getStatus(): AgentStatus { /* ... */ }
}
```

### Self-hosting the relay

```bash
# Clone the repo and run
git clone https://github.com/your-username/codex-remote-control.git
cd codex-remote-control
pnpm install && pnpm build
npx @crc/relay --port 8080
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes
4. Run `pnpm test` and `pnpm typecheck`
5. Commit with conventional commits
6. Open a pull request

## License

MIT © Chakib Bouabd
