# @happy-vibecode/web

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Runtime](https://img.shields.io/badge/runtime-Cloudflare%20Workers-orange)
![Framework](https://img.shields.io/badge/framework-Next.js%2016-black)
![License](https://img.shields.io/badge/license-MIT-green)

The main web application for Happy Vibecode — a real-time agent control dashboard that lets users manage and interact with local AI agents (Gemini CLI, Claude Code, Codex, Kilo, Cline, and more) from a web browser. Built with Next.js 16 via [vinext](https://github.com/involvex/vinext) on Cloudflare Workers, it uses a BridgeAgent Durable Object to relay WebSocket messages between the browser and locally-running CLI agents.

## Table of Contents

- [Getting Started](#getting-started)
- [Features](#features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [API Routes](#api-routes)
- [Durable Objects](#durable-objects)
- [Authentication](#authentication)
- [Dependencies](#dependencies)
- [Scripts](#scripts)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) 1.3.x
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) CLI (installed as dev dependency)
- Cloudflare account with D1, KV, and Durable Objects enabled
- Node.js >= 18

### Installation

```bash
# From the monorepo root
bun install

# Or directly in this package
cd apps/web
bun install
```

### Development

```bash
# Start the dev server (Vite + vinext)
bun run dev

# Generate Cloudflare Worker types (run after modifying wrangler.jsonc)
bun run types
```

### Deployment

```bash
# Build and deploy to Cloudflare Workers
bun run deploy
```

This runs `wrangler types`, `vite build`, and `wrangler deploy` in sequence.

## Features

- **Real-time agent control** — WebSocket-based communication with local AI agents via a BridgeAgent Durable Object
- **Chat interface** — Streaming markdown chat UI with conversation history
- **Admin panel** — User management, role-based access control, analytics, audit logs, and agent configuration
- **Authentication** — Better Auth with GitHub OAuth, automatic API token generation
- **Workspace management** — Organize projects and associate them with agent sessions
- **Billing integration** — Stripe-powered subscription management with plan tiers (free/pro)
- **Support tickets** — In-app ticketing system for bug reports, feature requests, and billing issues
- **User profiles** — Account settings, password management, and email linking
- **Dark mode** — Tailwind CSS v4 with dark theme by default

## Architecture

The web app runs as a single Cloudflare Worker that handles both the API layer and the Next.js frontend via vinext.

### Worker Routing (`worker/index.ts`)

Incoming requests are routed as follows:

| Pattern                 | Handler                                                    |
| ----------------------- | ---------------------------------------------------------- |
| `/_vinext/image`        | Cloudflare Images optimization                             |
| `/api/auth/*`           | Better Auth handler                                        |
| `/api/config/turnstile` | Returns public Turnstile site key                          |
| `/api/*`                | Hono API from [`@happy-vibecode/api`](../../packages/api/) |
| `/agents/BridgeAgent/*` | WebSocket upgrade → BridgeAgent Durable Object             |
| Everything else         | vinext (Next.js) handler                                   |

### Data Storage

| Binding       | Type              | Purpose                                                         |
| ------------- | ----------------- | --------------------------------------------------------------- |
| `DB`          | D1 Database       | Primary relational data (users, workspaces, sessions, messages) |
| `KV`          | KV Namespace      | Caching, session tokens, configuration                          |
| `BridgeAgent` | Durable Object    | WebSocket relay and message persistence                         |
| `IMAGES`      | Cloudflare Images | Image optimization and serving                                  |

## Project Structure

```
apps/web/
├── app/                        # Next.js App Router (vinext)
│   ├── admin/                  # Admin panel pages
│   │   ├── agents/             # Agent management
│   │   ├── analytics/          # Usage analytics
│   │   ├── audit/              # Audit log viewer
│   │   ├── roles/              # Role & permission management
│   │   └── users/              # User management
│   ├── auth/callback/          # OAuth callback handler
│   ├── chat/                   # Chat interface (Chat.tsx, page.tsx)
│   ├── components/             # Shared UI (Footer, Nav, WorkspaceSelector)
│   ├── contact/                # Contact page
│   ├── dashboard/              # Main dashboard
│   ├── funding/                # Funding/sponsorship page
│   ├── history/                # Session history
│   ├── hooks/                  # React hooks (useAuth, useWorkspaces)
│   ├── login/                  # Login page
│   ├── privacy/                # Privacy policy
│   ├── profile/                # User profile
│   ├── settings/               # App settings
│   ├── terms/                  # Terms of service
│   ├── globals.css             # Global Tailwind styles
│   ├── layout.tsx              # Root layout (Geist fonts, dark mode)
│   └── page.tsx                # Landing page (hero, features, quick start)
├── lib/
│   └── auth-client.ts          # Better Auth React client
├── public/                     # Static assets (favicon, icons, SVGs)
├── worker/                     # Cloudflare Worker entry
│   ├── index.ts                # Main worker (routing, auth, API mount)
│   ├── bridge-agent.ts         # BridgeAgent Durable Object
│   └── auth.ts                 # Better Auth server setup
├── vite.config.ts              # Vite config (vinext + Cloudflare plugin)
├── wrangler.jsonc              # Wrangler configuration
├── postcss.config.mjs          # PostCSS config
├── tsconfig.json               # TypeScript config
└── worker-configuration.d.ts   # Generated Cloudflare types
```

## Configuration

### Environment Variables

| Variable               | Description                                    | Required |
| ---------------------- | ---------------------------------------------- | -------- |
| `BETTER_AUTH_SECRET`   | Secret key for Better Auth session signing     | Yes      |
| `GITHUB_CLIENT_ID`     | GitHub OAuth app client ID                     | Yes      |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app client secret                 | Yes      |
| `STRIPE_SECRET_KEY`    | Stripe secret key for billing                  | Yes      |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret for bot protection | Yes      |

### Wrangler Configuration (`wrangler.jsonc`)

```jsonc
{
	"name": "happy-vibecode",
	"main": "./worker/index.ts",
	"compatibility_date": "2026-02-12",
	"compatibility_flags": ["nodejs_compat"],
	"d1_databases": [{"binding": "DB", "database_name": "happy-vibecode-db"}],
	"kv_namespaces": [{"binding": "KV", "id": "..."}],
	"durable_objects": {
		"bindings": [{"name": "BridgeAgent", "class_name": "BridgeAgent"}],
	},
}
```

## API Routes

All API endpoints are mounted under `/api/*`. See [`@happy-vibecode/api`](../../packages/api/) for full route documentation.

Key endpoints:

| Route                     | Description              |
| ------------------------- | ------------------------ |
| `POST /api/auth/register` | Create new account       |
| `POST /api/auth/login`    | Email/password login     |
| `GET /api/user/profile`   | Get current user profile |
| `GET /api/workspaces`     | List user workspaces     |
| `GET /api/agents`         | List available agents    |
| `GET /api/sessions`       | List active sessions     |
| `GET /api/tickets`        | List support tickets     |
| `GET /api/admin/users`    | Admin: list all users    |

## Durable Objects

### BridgeAgent

The `BridgeAgent` Durable Object (`worker/bridge-agent.ts`) serves as a WebSocket relay between the web/mobile clients and locally-running CLI agents.

**Connection flow:**

1. CLI agent runs `happy connect <agent>` which opens a WebSocket to `wss://<host>/agents/BridgeAgent/<room-id>`
2. Browser connects to the same WebSocket endpoint with a Bearer token
3. BridgeAgent relays messages between both parties and persists chat messages to D1

**State management:**

- Uses `setState()` from the Agents SDK for type-safe state
- Implements `validateStateChange` for state validation
- Persists message logs via `@happy-vibecode/db`

## Authentication

Authentication is handled by [Better Auth](https://www.better-auth.com/) with:

- **GitHub OAuth** — Primary login method
- **Email/Password** — Optional fallback with PBKDF2-SHA256 hashing
- **API Tokens** — Automatically generated per user for CLI access
- **Role-based access** — Admin/user roles with granular permissions

The auth server is configured in `worker/auth.ts` and uses the Drizzle adapter with [`@happy-vibecode/db`](../../packages/db/).

## Dependencies

### Internal

| Package                                            | Purpose                                    |
| -------------------------------------------------- | ------------------------------------------ |
| [`@happy-vibecode/api`](../../packages/api/)       | Hono API routes mounted at `/api/*`        |
| [`@happy-vibecode/db`](../../packages/db/)         | Drizzle ORM schemas and D1 database access |
| [`@happy-vibecode/shared`](../../packages/shared/) | Shared types, Zod schemas, and utilities   |

### External

| Package                             | Purpose                         |
| ----------------------------------- | ------------------------------- |
| `next` 16                           | React framework (via vinext)    |
| `hono`                              | Lightweight API framework       |
| `better-auth` + `@better-auth/expo` | Authentication                  |
| `drizzle-orm`                       | Database ORM for D1             |
| `zod`                               | Runtime validation              |
| `@cloudflare/kumo`                  | Cloudflare UI component library |
| `recharts`                          | Analytics charts                |
| `streamdown`                        | Streaming markdown rendering    |
| `react-hook-form`                   | Form management                 |

## Scripts

| Script      | Command                                          | Description                      |
| ----------- | ------------------------------------------------ | -------------------------------- |
| `dev`       | `vite dev`                                       | Start development server         |
| `build`     | `vite build`                                     | Build for production             |
| `prebuild`  | `bun run lint:fix && bun run typecheck`          | Lint and typecheck before build  |
| `deploy`    | `bun run types && vite build && wrangler deploy` | Build and deploy to Cloudflare   |
| `lint`      | `oxlint --ignore-path dist`                      | Lint source files                |
| `lint:fix`  | `oxlint --fix --ignore-path dist`                | Lint and auto-fix                |
| `typecheck` | `tsc --noEmit`                                   | Run TypeScript type checking     |
| `types`     | `wrangler types`                                 | Generate Cloudflare Worker types |

## Examples

### Connecting to an Agent via WebSocket

```typescript
import {useAgentChat} from 'agents/react'

const {messages, sendMessage} = useAgentChat({
	agent: 'bridge-agent',
	name: 'my-room',
})

// Send a prompt to the connected CLI agent
sendMessage('Hello, can you review this code?')
```

### Using the Auth Client

```typescript
import {authClient} from '@/lib/auth-client'

// GitHub OAuth login
await authClient.signIn.social({provider: 'github'})

// Get current session
const session = await authClient.getSession()
```

### Fetching API Data

```typescript
const response = await fetch('/api/workspaces', {
	headers: {
		Authorization: `Bearer ${apiToken}`,
	},
})
const workspaces = await response.json()
```

## Troubleshooting

### `wrangler types` fails with binding errors

Ensure `wrangler.jsonc` has all required bindings (D1, KV, Durable Objects) configured. Run `wrangler types` after any changes to the wrangler config.

### WebSocket connection drops

Check that your Cloudflare zone has WebSocket support enabled. BridgeAgent connections require the `/agents/BridgeAgent/*` route to be handled before the catch-all vinext handler.

### Auth callback returns 500

Verify that `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` environment variables are set in your Wrangler environment. Check the Better Auth configuration in `worker/auth.ts`.

### D1 database errors after schema changes

Run database migrations from the `@happy-vibecode/db` package:

```bash
bun run -F @happy-vibecode/db generate
bun run -F @happy-vibecode/db migrate
```

## Contributing

See the root [CONTRIBUTING.md](../../README.md#contributing) for general guidelines.

For this package specifically:

- Follow the existing file-based routing conventions in `app/`
- Use `@happy-vibecode/shared` for types and validation schemas
- Use `@happy-vibecode/db` for all database access — do not import `drizzle-orm` directly
- Run `bun run typecheck` and `bun run lint` before submitting changes
- Keep worker code (`worker/`) minimal — delegate business logic to `@happy-vibecode/api`

## License

This project is part of the [Happy Vibecode](../../README.md) monorepo. See the root LICENSE file for details.
