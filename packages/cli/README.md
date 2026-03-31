# @happy-vibecode/cli

![Version](https://img.shields.io/badge/version-0.1.1-blue)
![Runtime](https://img.shields.io/badge/runtime-Bun%20%7C%20Node-green)
![License](https://img.shields.io/badge/license-MIT-green)

Command-line interface for the Happy Vibecode platform. Bridges local AI agents to the cloud service via WebSocket, enabling remote control from the web dashboard or mobile app. All agents are served through **[opencode](https://opencode.ai)** as a unified model server — no direct subprocess spawning per agent.

## Table of Contents

- [Getting Started](#getting-started)
- [Features](#features)
- [Commands](#commands)
- [Architecture](#architecture)
- [Supported Agents](#supported-agents)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Dependencies](#dependencies)
- [Scripts](#scripts)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Getting Started

### Prerequisites

Install [opencode](https://opencode.ai):

```bash
bun add -g opencode-ai
# or
npm install -g opencode-ai
```

### Installation

#### From npm (once published)

```bash
npm install -g @happy-vibecode/cli
# Then run via:
happy <command>
```

#### From source (development)

```bash
# From the monorepo root
bun install
bun run -F @happy-vibecode/cli build

# Run directly
node packages/cli/dist/index.js <command>

# Or via bun
cd packages/cli
bun run start <command>
```

### Quick Start

```bash
# 1. Authenticate with the Happy Vibecode platform
happy login

# 2. Initialize default agent configuration
happy init

# 3. Check your setup
happy doctor

# 4. List available opencode providers and models
happy providers

# 5. Connect your first agent
happy connect gemini

# 6. Connect with a specific model (provider/model format)
happy connect claude --model anthropic/claude-opus-4-5
```

## Features

- **opencode model server** — All agents run through `opencode serve` as a unified AI backend; no per-agent subprocess spawning
- **Hybrid server startup** — SDK `createOpencodeServer` used first; falls back to manual `child_process` spawn for compatibility
- **Multi-agent support** — Gemini, Claude Code, Codex, OpenCode AI, GitHub Copilot, Kilo, Cline, and custom agents
- **Provider/model discovery** — `happy providers` lists all opencode-configured providers and their models
- **WebSocket bridge** — Real-time bidirectional communication between agents and the cloud
- **opencode URL relay** — CLI sends the local opencode serve URL to connected web/mobile clients (enables direct access when needed)
- **Workspace management** — Configure and switch between project directories
- **Diagnostics** — `happy doctor` checks for config issues, agent binaries, and opencode serve health

## Commands

### Authentication

| Command        | Description                                                       |
| -------------- | ----------------------------------------------------------------- |
| `happy login`  | Register a new account or authenticate with an existing API token |
| `happy whoami` | Show current authenticated user and server status                 |

### Agent Connection

| Command                 | Description                                                         |
| ----------------------- | ------------------------------------------------------------------- |
| `happy connect <agent>` | Connect a local AI agent to the Happy Vibecode bridge via WebSocket |
| `happy init`            | Create a default `agents.json` configuration file                   |
| `happy providers`       | List all providers and models available in opencode                 |

### Connect Options

| Flag                    | Description                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| `-r, --room <roomId>`   | Bridge room ID (defaults to your user ID)                                                  |
| `-d, --dir <directory>` | Workspace directory to run agent in                                                        |
| `-w, --workspace <id>`  | Workspace ID from config                                                                   |
| `-m, --model <model>`   | Model to use — plain (`claude-opus-4-5`) or `provider/model` (`anthropic/claude-opus-4-5`) |
| `-s, --server <url>`    | opencode serve URL (default: `http://127.0.0.1:4096`, auto-starts if not running)          |
| `-c, --cors <origins>`  | CORS origins for opencode serve — comma-separated (used in manual spawn fallback)          |
| `-v, --verbose`         | Verbose output                                                                             |

### Workspace Management

| Command                             | Description                                    |
| ----------------------------------- | ---------------------------------------------- |
| `happy workspace list`              | List all configured workspaces                 |
| `happy workspace add <name> <path>` | Add a new workspace                            |
| `happy workspace remove <id>`       | Remove a workspace                             |
| `happy workspace set-default <id>`  | Set default provider and model for a workspace |
| `happy workspace activate <id>`     | Set a workspace as the active workspace        |

### Configuration

| Command                          | Description                         |
| -------------------------------- | ----------------------------------- |
| `happy config show`              | Display current configuration       |
| `happy config set <key> <value>` | Set a configuration value           |
| `happy config unset <key>`       | Remove a configuration value        |
| `happy config reset`             | Reset all configuration to defaults |

### Diagnostics

| Command        | Description                                                     |
| -------------- | --------------------------------------------------------------- |
| `happy doctor` | Diagnose config, binary availability, and opencode serve health |
| `happy status` | Show server health status and active sessions                   |

## Architecture

```
happy connect <agent>
    │
    ├── 1. ensureOpencodeServer()
    │       ├── a) Already running at :4096 → attach (health check passes)
    │       ├── b) SDK createOpencodeServer() → managed spawn
    │       └── c) child_process.spawn opencode serve :4096 + health poll (fallback)
    │
    ├── 2. Create SDK client → new session with resolved model
    │       └── agentToOpencodeModel(agentId, --model flag)
    │             ├── Format: "anthropic/claude-opus-4-5" → {providerID, modelID}
    │             └── Format: "claude" → {providerID: "anthropic", modelID: "default"}
    │
    ├── 3. Open WebSocket to BridgeAgent Durable Object (cloud)
    │       └── On WS open → send { type: 'opencode_url', url: 'http://127.0.0.1:4096' }
    │                       → send { type: 'status', status: 'cli_connected' }
    │
    └── 4. Relay loop
            ├── WS message (prompt) → opencode session.prompt(text)
            ├── opencode events → WS response chunks
            └── SIGTERM / WS close → opencodeServer.close()
```

### Model Flag Format

The `--model` flag supports two formats:

```bash
# Short form — provider inferred from agent type
happy connect gemini --model gemini-2.0-flash

# Full form — explicit provider/model
happy connect claude --model anthropic/claude-opus-4-5
happy connect gemini --model google/gemini-2.5-pro
happy connect codex  --model openai/o3

# Agent-type to provider mapping
# gemini    → google
# claude    → anthropic
# codex     → openai
# copilot   → github
# opencode-ai, kilo, cline → anthropic
```

### Provider/Model Discovery

```bash
# List all providers configured in opencode (reads ~/.config/opencode/config.json)
happy providers
```

Example output:

```
Available providers in opencode:
  anthropic (env)
    Models: claude-opus-4-5, claude-sonnet-4-5, claude-haiku-4-5
  google (env)
    Models: gemini-2.5-pro, gemini-2.0-flash
  openai (env)
    Models: gpt-4o, o3
```

### opencode URL Relay

When the CLI connects, it sends `{ type: 'opencode_url', url }` through the WebSocket bridge to all connected web/mobile clients. The web app stores this URL and shows it in the debug panel (`Debug mode` toggle in the header), useful for verifying direct connectivity.

## Supported Agents

| Agent         | Resolved Provider | Notes                                          |
| ------------- | ----------------- | ---------------------------------------------- |
| `gemini`      | `google`          | Routes through opencode, no direct spawn       |
| `claude`      | `anthropic`       | Routes through opencode, no direct spawn       |
| `codex`       | `openai`          | Routes through opencode, no direct spawn       |
| `opencode-ai` | `anthropic`       | Native opencode agent                          |
| `copilot`     | `github`          | Routes through opencode                        |
| `kilo`        | `anthropic`       | Routes through opencode                        |
| `cline`       | `anthropic`       | Routes through opencode                        |
| Custom        | User-defined      | Extend `PROVIDER_CONFIGS` in `llm-provider.ts` |

## Project Structure

```
packages/cli/
├── src/
│   ├── index.ts                  # CLI entry — registers all commands via Commander
│   ├── config.ts                 # HappyConfig, readConfig/writeConfig, bridge code generation
│   ├── commands/
│   │   ├── login.ts              # happy login
│   │   ├── connect.ts            # happy connect <agent>
│   │   ├── init.ts               # happy init
│   │   ├── providers.ts          # happy providers — list opencode providers/models
│   │   ├── workspace.ts          # happy workspace (list/add/remove/set-default/activate)
│   │   ├── config.ts             # happy config (show/set/unset/reset)
│   │   ├── doctor.ts             # happy doctor (config + opencode health checks)
│   │   ├── status.ts             # happy status
│   │   └── whoami.ts             # happy whoami
│   ├── config/
│   │   └── workspace.ts          # Workspace CRUD operations
│   ├── types/
│   │   └── llm-provider.ts       # LLMProvider, PROVIDER_CONFIGS, AgentDefinition, etc.
│   └── utils/
│       ├── agents-config.ts      # DEFAULT_AGENTS from PROVIDER_CONFIGS
│       ├── opencode-server.ts    # ensureOpencodeServer() — hybrid spawn (SDK → manual fallback)
│       └── log.ts                # Debug logging (setDebug, debug, debugTime, debugFetch)
├── dist/                         # Built output (gitignored)
├── tsconfig.json
├── eslint.config.ts
└── package.json
```

## Configuration

### HappyConfig

Stored at `~/.happy/config.json`:

| Field        | Type      | Description                                     |
| ------------ | --------- | ----------------------------------------------- |
| `apiToken`   | `string`  | API authentication token                        |
| `serverUrl`  | `string`  | Happy Vibecode server URL (default: production) |
| `userId`     | `string?` | Authenticated user ID                           |
| `bridgeCode` | `string?` | Bridge connection code                          |

### Agents Configuration (`agents.json`)

Created by `happy init`. Defines available agents and workspaces:

```typescript
interface AgentsConfig {
	agents: AgentDefinition[]
	workspaces?: WorkspaceConfig[]
}

interface AgentDefinition {
	name: string // Display name
	command: string // CLI command to execute (legacy — opencode is the actual server)
	args?: string[] // Default arguments
	promptFlag?: string // Flag for passing prompts
	modelFlag?: string // Flag for passing model names
	description?: string
}
```

### Debug Logging

Enable debug mode for verbose output:

```bash
DEBUG=1 happy connect gemini
# Output includes: opencode server startup, WebSocket frames, SDK calls, timing
```

## Dependencies

### Internal

| Package                                | Purpose                             |
| -------------------------------------- | ----------------------------------- |
| [`@happy-vibecode/shared`](../shared/) | Shared types and validation schemas |

### External

| Package             | Purpose                                                                           |
| ------------------- | --------------------------------------------------------------------------------- |
| `@opencode-ai/sdk`  | opencode SDK — `createOpencodeClient`, `createOpencodeServer`, session/prompt API |
| `commander` ^14.0.0 | CLI framework and command parsing                                                 |
| `execa` latest      | Spawn and manage local processes                                                  |
| `ora` ^6.3.1        | Terminal spinner for loading states                                               |
| `ws` ^8.18.2        | WebSocket client for bridge connections                                           |

## Scripts

| Script           | Command                                                         | Description              |
| ---------------- | --------------------------------------------------------------- | ------------------------ |
| `build`          | `bun build ./src/index.ts --outfile dist/index.js --target bun` | Build for production     |
| `dev`            | `bun run --watch src/index.ts`                                  | Run in watch mode        |
| `start`          | `bun run ./src/index.ts`                                        | Run CLI directly         |
| `lint`           | `eslint .`                                                      | Lint source files        |
| `lint:fix`       | `eslint . --fix`                                                | Lint and auto-fix        |
| `typecheck`      | `tsc --noEmit`                                                  | TypeScript type checking |
| `prepublishOnly` | `bun run lint:fix && bun run typecheck && bun run build`        | Pre-publish checks       |

## Examples

### Complete Setup Flow

```bash
# Authenticate
happy login

# Initialize agent config
happy init

# Check everything
happy doctor

# See what models are available
happy providers

# Connect Gemini using default model
happy connect gemini

# Connect Claude with a specific model
happy connect claude --model anthropic/claude-opus-4-5

# Connect with CORS enabled (for local web dev)
happy connect gemini --cors http://localhost:5173
```

### Connecting Different Agents

```bash
# Connect Gemini (resolves to google provider)
happy connect gemini

# Connect Claude Code (resolves to anthropic)
happy connect claude --model anthropic/claude-sonnet-4-5

# Connect OpenAI Codex (resolves to openai)
happy connect codex --model openai/o3

# Use full provider/model override for any agent
happy connect gemini --model anthropic/claude-opus-4-5
```

### Managing Configuration

```bash
# View all config
happy config show

# Set server URL (for self-hosted)
happy config set serverUrl https://my-instance.example.com

# Reset to defaults
happy config reset
```

### Using Debug Mode

```bash
# Enable verbose logging (shows opencode server startup, SDK calls, WS frames)
DEBUG=1 happy connect gemini
```

## Troubleshooting

### `opencode binary not found`

Install opencode globally:

```bash
bun add -g opencode-ai
# or
npm install -g opencode-ai
```

Then verify: `opencode --version`

### `command not found: happy`

After installing globally, ensure the npm global bin directory is in your `PATH`:

```bash
npm config get prefix
# Add <prefix>/bin to your PATH
```

When running from source, use `node dist/index.js` or `bun run start`.

### `opencode serve did not become healthy`

opencode failed to start. Try starting it manually to see the error:

```bash
opencode serve --port 4096
```

Common causes: port already in use, missing API keys in `~/.config/opencode/config.json`.

### `ECONNREFUSED` on connect

The Happy Vibecode server is unreachable. Check:

1. Your internet connection
2. The `serverUrl` in config: `happy config show`
3. Server status: `happy status`

### `401 Unauthorized`

Your API token is invalid or expired. Re-authenticate:

```bash
happy login
```

### `happy doctor` reports issues

The doctor command checks:

- Config file existence and validity
- API token presence
- Agent binary availability
- **opencode binary** in PATH
- **opencode serve** health status (port 4096)

Follow the suggestions in the output to resolve each issue.

## Contributing

See the root [CONTRIBUTING.md](../../README.md#contributing) for general guidelines.

For this package specifically:

- One command file per command in `src/commands/`
- Use Commander.js patterns for argument parsing
- Use `ora` for all async operations that may take time
- All AI interactions route through opencode SDK — no direct agent subprocess spawning
- Add new agent support by extending `PROVIDER_CONFIGS` in `src/types/llm-provider.ts`
- Run `bun run typecheck` and `bun run lint` before submitting changes

## License

This project is part of the [Happy Vibecode](../../README.md) monorepo. See the root LICENSE file for details.

![Version](https://img.shields.io/badge/version-0.1.1-blue)
![Runtime](https://img.shields.io/badge/runtime-Bun%20%7C%20Node-green)
![License](https://img.shields.io/badge/license-MIT-green)

Command-line interface for the Happy Vibecode platform. Connects local AI agents (Gemini CLI, Claude Code, Codex, Kilo, Cline, and more) to the Happy Vibecode cloud service, enabling remote control of your coding agents from the web dashboard or mobile app via WebSocket bridges.

## Table of Contents

- [Getting Started](#getting-started)
- [Features](#features)
- [Commands](#commands)
- [Supported Agents](#supported-agents)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Dependencies](#dependencies)
- [Scripts](#scripts)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Getting Started

### Installation

#### From npm (once published)

```bash
npm install -g @happy-vibecode/cli

# Or use the shorthand
npm install -g @happy-vibecode/cli
# Then run via:
happy <command>
vibe <command>
```

#### From source (development)

```bash
# From the monorepo root
bun install
bun run -F @happy-vibecode/cli build

# Run directly
node packages/cli/dist/index.js <command>

# Or via bun
cd packages/cli
bun run start <command>
```

### Quick Start

```bash
# 1. Authenticate with the Happy Vibecode platform
happy login

# 2. Initialize default agent configuration
happy init

# 3. Check your setup
happy doctor

# 4. Connect your first agent
happy connect gemini
```

## Features

- **Multi-agent support** — Works with Gemini, Claude Code, Codex, OpenCode AI, GitHub Copilot, Kilo, Cline, and custom agents
- **WebSocket bridge** — Real-time bidirectional communication between local agents and the cloud
- **Workspace management** — Configure and switch between project directories
- **Configuration management** — Show, set, and reset CLI configuration
- **Diagnostics** — `happy doctor` checks for common configuration issues
- **Status monitoring** — View server health and active sessions
- **Auth management** — Login, verify tokens, check identity

## Commands

### Authentication

| Command        | Description                                                       |
| -------------- | ----------------------------------------------------------------- |
| `happy login`  | Register a new account or authenticate with an existing API token |
| `happy whoami` | Show current authenticated user and server status                 |

### Agent Connection

| Command                 | Description                                                         |
| ----------------------- | ------------------------------------------------------------------- |
| `happy connect <agent>` | Connect a local AI agent to the Happy Vibecode bridge via WebSocket |
| `happy init`            | Create a default `agents.json` configuration file                   |

### Workspace Management

| Command                             | Description                                    |
| ----------------------------------- | ---------------------------------------------- |
| `happy workspace list`              | List all configured workspaces                 |
| `happy workspace add <name> <path>` | Add a new workspace                            |
| `happy workspace remove <id>`       | Remove a workspace                             |
| `happy workspace set-default <id>`  | Set default provider and model for a workspace |
| `happy workspace activate <id>`     | Set a workspace as the active workspace        |

### Configuration

| Command                          | Description                         |
| -------------------------------- | ----------------------------------- |
| `happy config show`              | Display current configuration       |
| `happy config set <key> <value>` | Set a configuration value           |
| `happy config unset <key>`       | Remove a configuration value        |
| `happy config reset`             | Reset all configuration to defaults |

### Diagnostics

| Command        | Description                                   |
| -------------- | --------------------------------------------- |
| `happy doctor` | Diagnose configuration and connection issues  |
| `happy status` | Show server health status and active sessions |

## Supported Agents

| Agent       | Provider     | Command      | Prompt Flag  | Model Flag   |
| ----------- | ------------ | ------------ | ------------ | ------------ |
| Gemini      | Google       | `gemini`     | `-p`         | —            |
| Claude      | Anthropic    | `claude`     | `-p`         | `-m`         |
| Codex       | OpenAI       | `codex`      | `-p`         | —            |
| OpenCode AI | OpenCode     | `opencode`   | `--prompt`   | —            |
| Copilot     | GitHub       | `copilot`    | `-p`         | —            |
| Kilo        | Kilocode     | `kilo`       | `--prompt`   | —            |
| Cline       | Cline        | `cline`      | `-p`         | —            |
| Custom      | User-defined | Configurable | Configurable | Configurable |

## Architecture

```
CLI (this package)
    │
    ├── happy login ──→ POST /api/auth/register ──→ D1
    ├── happy connect <agent>
    │       │
    │       ├── Spawns local agent process (e.g., gemini -p)
    │       ├── Opens WebSocket to BridgeAgent Durable Object
    │       └── Relays stdin/stdout ↔ WebSocket messages
    │
    ├── happy status ──→ GET /api/health + GET /api/sessions
    └── happy doctor ──→ Local config validation
```

### Connection Flow

1. `happy connect <agent>` reads the agent configuration from `agents.json`
2. The CLI spawns the local agent process (e.g., `gemini -p`)
3. A WebSocket connection opens to `wss://<server>/agents/BridgeAgent/<room-id>`
4. The CLI relays prompts from the WebSocket to the agent's stdin
5. Agent output (stdout/stderr) is relayed back through the WebSocket
6. The web/mobile client can send prompts and receive responses in real-time

## Project Structure

```
packages/cli/
├── src/
│   ├── index.ts                  # CLI entry — registers all commands via Commander
│   ├── config.ts                 # HappyConfig, readConfig/writeConfig, bridge code generation
│   ├── commands/
│   │   ├── login.ts              # happy login
│   │   ├── connect.ts            # happy connect <agent>
│   │   ├── init.ts               # happy init
│   │   ├── workspace.ts          # happy workspace (list/add/remove/set-default/activate)
│   │   ├── config.ts             # happy config (show/set/unset/reset)
│   │   ├── doctor.ts             # happy doctor
│   │   ├── status.ts             # happy status
│   │   └── whoami.ts             # happy whoami
│   ├── config/
│   │   └── workspace.ts          # Workspace CRUD operations
│   ├── types/
│   │   └── llm-provider.ts       # LLMProvider, PROVIDER_CONFIGS, AgentDefinition, etc.
│   └── utils/
│       ├── agents-config.ts      # DEFAULT_AGENTS from PROVIDER_CONFIGS
│       └── log.ts                # Debug logging (setDebug, debug, debugTime, debugFetch)
├── dist/                         # Built output (gitignored)
├── tsconfig.json
├── eslint.config.ts
└── package.json
```

## Configuration

### HappyConfig

Stored at `~/.happy-vibecode/config.json` (or platform-appropriate config location):

| Field        | Type      | Description                                     |
| ------------ | --------- | ----------------------------------------------- |
| `apiToken`   | `string`  | API authentication token                        |
| `serverUrl`  | `string`  | Happy Vibecode server URL (default: production) |
| `userId`     | `string?` | Authenticated user ID                           |
| `bridgeCode` | `string?` | Bridge connection code                          |

### Agents Configuration (`agents.json`)

Created by `happy init`. Defines available agents and workspaces:

```typescript
interface AgentsConfig {
	agents: AgentDefinition[]
	workspaces?: WorkspaceConfig[]
}

interface AgentDefinition {
	name: string // Display name
	command: string // CLI command to execute
	args?: string[] // Default arguments
	promptFlag?: string // Flag for passing prompts
	modelFlag?: string // Flag for passing model names
	description?: string // Human-readable description
}

interface WorkspaceConfig {
	name: string // Workspace name
	path: string // Filesystem path
	defaultProvider?: LLMProvider
	defaultModel?: string
}
```

### Debug Logging

Enable debug mode for verbose output:

```bash
# Via environment variable
DEBUG=1 happy connect gemini

# Or programmatically
import { setDebug } from "./utils/log";
setDebug(true);
```

## Dependencies

### Internal

| Package                                | Purpose                             |
| -------------------------------------- | ----------------------------------- |
| [`@happy-vibecode/shared`](../shared/) | Shared types and validation schemas |

### External

| Package             | Purpose                                 |
| ------------------- | --------------------------------------- |
| `commander` ^14.0.0 | CLI framework and command parsing       |
| `execa` latest      | Spawn and manage local agent processes  |
| `ora` ^6.3.1        | Terminal spinner for loading states     |
| `ws` ^8.18.2        | WebSocket client for bridge connections |

## Scripts

| Script           | Command                                                         | Description              |
| ---------------- | --------------------------------------------------------------- | ------------------------ |
| `build`          | `bun build ./src/index.ts --outfile dist/index.js --target bun` | Build for production     |
| `dev`            | `bun run --watch src/index.ts`                                  | Run in watch mode        |
| `start`          | `bun run ./src/index.ts`                                        | Run CLI directly         |
| `lint`           | `eslint .`                                                      | Lint source files        |
| `lint:fix`       | `eslint . --fix`                                                | Lint and auto-fix        |
| `typecheck`      | `tsc --noEmit`                                                  | TypeScript type checking |
| `prepublishOnly` | `bun run lint:fix && bun run typecheck && bun run build`        | Pre-publish checks       |

## Examples

### Complete Setup Flow

```bash
# Authenticate
happy login
# Enter your API token when prompted

# Initialize agent config
happy init

# Add a workspace
happy workspace add my-project /path/to/project

# Check everything is working
happy doctor

# View your identity
happy whoami

# Check server status
happy status
```

### Connecting Different Agents

```bash
# Connect Gemini
happy connect gemini

# Connect Claude Code
happy connect claude

# Connect Codex
happy connect codex
```

### Managing Configuration

```bash
# View all config
happy config show

# Set server URL (for self-hosted)
happy config set serverUrl https://my-instance.example.com

# Reset to defaults
happy config reset
```

### Using Debug Mode

```bash
# Enable verbose logging
DEBUG=1 happy connect gemini

# Output includes WebSocket frames, HTTP requests, and timing
```

## Troubleshooting

### `command not found: happy`

After installing globally, ensure the npm global bin directory is in your `PATH`:

```bash
npm config get prefix
# Add <prefix>/bin to your PATH
```

When running from source, use `node dist/index.js` or `bun run start`.

### `ENOENT` when connecting an agent

The agent CLI binary is not installed or not on `PATH`. Install the required agent:

```bash
# Gemini
npm install -g @anthropic-ai/gemini-cli  # (example, check actual package)

# Claude Code
npm install -g @anthropic-ai/claude-code
```

Then verify it's available:

```bash
which gemini
which claude
```

### `ECONNREFUSED` on connect

The Happy Vibecode server is unreachable. Check:

1. Your internet connection
2. The `serverUrl` in config: `happy config show`
3. Server status: `happy status`

### `401 Unauthorized`

Your API token is invalid or expired. Re-authenticate:

```bash
happy login
```

### `happy doctor` reports issues

The doctor command checks:

- Config file existence and validity
- API token presence
- Server connectivity
- Agent binary availability

Follow the suggestions in the output to resolve each issue.

## Contributing

See the root [CONTRIBUTING.md](../../README.md#contributing) for general guidelines.

For this package specifically:

- One command file per command in `src/commands/`
- Use Commander.js patterns for argument parsing
- Use `ora` for all async operations that may take time
- Use `execa` for process spawning (not raw `child_process`)
- Add new agent support by extending `PROVIDER_CONFIGS` in `src/types/llm-provider.ts`
- Run `bun run typecheck` and `bun run lint` before submitting changes

## License

This project is part of the [Happy Vibecode](../../README.md) monorepo. See the root LICENSE file for details.
