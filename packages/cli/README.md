# @happy-vibecode/cli

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
