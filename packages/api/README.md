# @happy-vibecode/api

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Runtime](https://img.shields.io/badge/runtime-Cloudflare%20Workers-orange)
![Framework](https://img.shields.io/badge/framework-Hono-green)
![License](https://img.shields.io/badge/license-MIT-green)

REST API backend for the Happy Vibecode platform. Built with [Hono](https://hono.dev/) and designed to run on Cloudflare Workers. Provides endpoints for authentication, user management, workspaces, agent sessions, billing, support tickets, admin operations, and bridge connectivity.

## Table of Contents

- [Getting Started](#getting-started)
- [Features](#features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Middleware](#middleware)
- [Configuration](#configuration)
- [Dependencies](#dependencies)
- [Scripts](#scripts)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) 1.3.x
- Cloudflare Workers environment (Wrangler)
- D1 database with [`@happy-vibecode/db`](../db/) schema applied

### Installation

```bash
# From the monorepo root
bun install
```

### Usage

The API is designed to be mounted within a Cloudflare Worker, not run standalone. It is imported and used in [`@happy-vibecode/web`](../../apps/web/):

```typescript
import {api} from '@happy-vibecode/api'

// Mount at /api/* in your Worker
app.route('/api', api)
```

### Type Checking

```bash
bun run -F @happy-vibecode/api typecheck
```

## Features

- **Authentication** — Register, login, token verification, and token rotation
- **User management** — Profile CRUD, password management, email linking
- **Workspace management** — Create, update, delete, and activate workspaces
- **Agent management** — CRUD for AI agent definitions (admin-restricted)
- **Session tracking** — Active agent session management
- **Device tokens** — Push notification token registration
- **Support tickets** — Ticket creation, response, and status management
- **Billing** — Stripe subscription integration
- **Bridge connectivity** — Agent bridge status and management
- **Admin dashboard** — User management, role assignment, analytics, audit logs
- **Audit logging** — Track administrative actions with actor/target details
- **RBAC** — Role-based access control with granular permissions

## Architecture

The API follows a modular route-based architecture:

```
Request → Hono Router → Middleware (auth, admin) → Route Handler → D1 Database
```

### Design Decisions

- **Hono over Express** — Lightweight, edge-native, first-class Cloudflare Workers support
- **Drizzle ORM** — Type-safe database access with D1 (SQLite)
- **Bearer token auth** — API tokens generated per user, validated against D1
- **Route separation** — Each domain (auth, users, workspaces, etc.) has its own route file
- **Middleware composition** — Auth and admin middleware are composable per-route

## Project Structure

```
packages/api/
├── src/
│   ├── index.ts                  # Main entry — mounts all routers under /api
│   ├── lib/
│   │   └── audit.ts              # logAuditEvent() helper
│   ├── middleware/
│   │   ├── auth.ts               # Bearer token auth middleware, ApiEnv interface
│   │   └── admin.ts              # Admin role check, requirePermission() helper
│   ├── routes/
│   │   ├── admin-agents.ts       # /api/admin/agents
│   │   ├── admin-analytics.ts    # /api/admin/analytics
│   │   ├── admin-audit.ts        # /api/admin/audit
│   │   ├── admin-roles.ts        # /api/admin/roles
│   │   ├── admin-users.ts        # /api/admin/users
│   │   ├── agents.ts             # /api/agents
│   │   ├── auth.ts               # /api/auth
│   │   ├── billing.ts            # /api/billing
│   │   ├── bridge.ts             # /api/bridge
│   │   ├── devices.ts            # /api/devices
│   │   ├── sessions.ts           # /api/sessions
│   │   ├── tickets.ts            # /api/tickets
│   │   ├── user.ts               # /api/user
│   │   └── workspaces.ts         # /api/workspaces
│   └── utils/
│       ├── password.ts           # PBKDF2-SHA256 hashPassword/verifyPassword
│       └── subscription.ts       # mapUserSubscription(), isSubscriptionEntitled()
├── tsconfig.json
└── package.json
```

## API Reference

### Health

| Method | Path          | Auth | Description           |
| ------ | ------------- | ---- | --------------------- |
| `GET`  | `/api/health` | No   | Health check endpoint |

### Authentication (`/api/auth`)

| Method | Path                     | Auth | Description               |
| ------ | ------------------------ | ---- | ------------------------- |
| `POST` | `/api/auth/register`     | No   | Create new user account   |
| `POST` | `/api/auth/login`        | No   | Email/password login      |
| `POST` | `/api/auth/verify`       | No   | Verify API token validity |
| `POST` | `/api/auth/token/rotate` | Yes  | Rotate API token          |

### User (`/api/user`)

| Method | Path                        | Auth | Description                    |
| ------ | --------------------------- | ---- | ------------------------------ |
| `GET`  | `/api/user/profile`         | Yes  | Get current user profile       |
| `PUT`  | `/api/user/profile`         | Yes  | Update user profile            |
| `GET`  | `/api/user/subscription`    | Yes  | Get subscription status        |
| `POST` | `/api/user/password/set`    | Yes  | Set password (for OAuth users) |
| `POST` | `/api/user/password/change` | Yes  | Change existing password       |
| `POST` | `/api/user/link-email`      | Yes  | Link email to account          |
| `GET`  | `/api/user/admin-status`    | Yes  | Check if user has admin role   |

### Workspaces (`/api/workspaces`)

| Method   | Path                           | Auth | Description             |
| -------- | ------------------------------ | ---- | ----------------------- |
| `GET`    | `/api/workspaces`              | Yes  | List user workspaces    |
| `POST`   | `/api/workspaces`              | Yes  | Create a new workspace  |
| `GET`    | `/api/workspaces/:id`          | Yes  | Get workspace by ID     |
| `PUT`    | `/api/workspaces/:id`          | Yes  | Update workspace        |
| `DELETE` | `/api/workspaces/:id`          | Yes  | Delete workspace        |
| `POST`   | `/api/workspaces/:id/activate` | Yes  | Set workspace as active |

### Agents (`/api/agents`)

| Method   | Path              | Auth  | Description                 |
| -------- | ----------------- | ----- | --------------------------- |
| `GET`    | `/api/agents`     | No    | List all active agents      |
| `GET`    | `/api/agents/:id` | No    | Get agent by ID             |
| `POST`   | `/api/agents`     | Admin | Create new agent definition |
| `PUT`    | `/api/agents/:id` | Admin | Update agent definition     |
| `DELETE` | `/api/agents/:id` | Admin | Delete agent                |

### Sessions (`/api/sessions`)

| Method   | Path                | Auth | Description          |
| -------- | ------------------- | ---- | -------------------- |
| `GET`    | `/api/sessions`     | Yes  | List active sessions |
| `POST`   | `/api/sessions`     | Yes  | Create new session   |
| `GET`    | `/api/sessions/:id` | Yes  | Get session by ID    |
| `DELETE` | `/api/sessions/:id` | Yes  | End session          |

### Devices (`/api/devices`)

| Method   | Path                  | Auth | Description                      |
| -------- | --------------------- | ---- | -------------------------------- |
| `POST`   | `/api/devices`        | Yes  | Register push notification token |
| `DELETE` | `/api/devices/:token` | Yes  | Unregister device token          |

### Tickets (`/api/tickets`)

| Method | Path                       | Auth | Description               |
| ------ | -------------------------- | ---- | ------------------------- |
| `GET`  | `/api/tickets`             | Yes  | List user tickets         |
| `POST` | `/api/tickets`             | Yes  | Create new ticket         |
| `GET`  | `/api/tickets/:id`         | Yes  | Get ticket with responses |
| `POST` | `/api/tickets/:id/respond` | Yes  | Add response to ticket    |
| `PUT`  | `/api/tickets/:id/status`  | Yes  | Update ticket status      |

### Billing (`/api/billing`)

| Method | Path                        | Auth | Description                           |
| ------ | --------------------------- | ---- | ------------------------------------- |
| `GET`  | `/api/billing/subscription` | Yes  | Get current subscription              |
| `POST` | `/api/billing/checkout`     | Yes  | Create Stripe checkout session        |
| `POST` | `/api/billing/webhook`      | No   | Stripe webhook handler                |
| `POST` | `/api/billing/portal`       | Yes  | Create Stripe customer portal session |

### Bridge (`/api/bridge`)

| Method | Path                  | Auth | Description                  |
| ------ | --------------------- | ---- | ---------------------------- |
| `GET`  | `/api/bridge/status`  | Yes  | Get bridge connection status |
| `POST` | `/api/bridge/connect` | Yes  | Initiate bridge connection   |

### Admin — Users (`/api/admin/users`)

| Method | Path                          | Auth  | Description                           |
| ------ | ----------------------------- | ----- | ------------------------------------- |
| `GET`  | `/api/admin/users`            | Admin | List all users with filters           |
| `POST` | `/api/admin/users`            | Admin | Create user (admin)                   |
| `GET`  | `/api/admin/users/:id`        | Admin | Get user details                      |
| `PUT`  | `/api/admin/users/:id`        | Admin | Update user                           |
| `PUT`  | `/api/admin/users/:id/status` | Admin | Update user status (active/suspended) |

### Admin — Roles (`/api/admin/roles`)

| Method   | Path                      | Auth                      | Description    |
| -------- | ------------------------- | ------------------------- | -------------- |
| `GET`    | `/api/admin/roles`        | Admin                     | List all roles |
| `POST`   | `/api/admin/roles`        | Admin                     | Create role    |
| `PUT`    | `/api/admin/roles/:id`    | Admin                     | Update role    |
| `DELETE` | `/api/admin/roles/:id`    | Admin                     | Delete role    |
| `POST`   | `/api/admin/roles/assign` | Bulk assign role to users |

### Admin — Analytics (`/api/admin/analytics`)

| Method | Path                            | Auth  | Description                |
| ------ | ------------------------------- | ----- | -------------------------- |
| `GET`  | `/api/admin/analytics/overview` | Admin | Dashboard overview metrics |
| `GET`  | `/api/admin/analytics/signups`  | Admin | Signup trend data          |
| `GET`  | `/api/admin/analytics/roles`    | Admin | Role distribution          |
| `GET`  | `/api/admin/analytics/sessions` | Admin | Session metrics            |
| `GET`  | `/api/admin/analytics/logins`   | Admin | Login heatmap              |

### Admin — Audit (`/api/admin/audit`)

| Method | Path               | Auth  | Description                  |
| ------ | ------------------ | ----- | ---------------------------- |
| `GET`  | `/api/admin/audit` | Admin | List audit logs with filters |

### Admin — Agents (`/api/admin/agents`)

| Method | Path                | Auth  | Description                          |
| ------ | ------------------- | ----- | ------------------------------------ |
| `GET`  | `/api/admin/agents` | Admin | List all agents (including inactive) |

## Middleware

### Auth Middleware (`middleware/auth.ts`)

Validates Bearer tokens against the `users` table in D1. Sets the authenticated user on the Hono context.

```typescript
import {auth} from '@happy-vibecode/api/middleware/auth'

app.get('/protected', auth, c => {
	const user = c.get('user')
	return c.json({userId: user.id})
})
```

### Admin Middleware (`middleware/admin.ts`)

Checks that the authenticated user has an admin role. Must be used after the auth middleware.

```typescript
import {admin, requirePermission} from '@happy-vibecode/api/middleware/admin'
import {auth} from '@happy-vibecode/api/middleware/auth'

// Require admin role
app.delete('/admin/users/:id', auth, admin, handler)

// Require specific permission
app.get(
	'/admin/analytics',
	auth,
	requirePermission('analytics', 'read'),
	handler,
)
```

### Permission Modules

| Module       | Actions             |
| ------------ | ------------------- |
| `users`      | read, write, delete |
| `roles`      | read, write, delete |
| `sessions`   | read, write, delete |
| `workspaces` | read, write, delete |
| `tickets`    | read, write, delete |
| `analytics`  | read                |
| `audit`      | read                |

## Configuration

### Cloudflare Workers Bindings

The API expects the following bindings on the Hono environment (`ApiEnv`):

| Binding                | Type                     | Description                 |
| ---------------------- | ------------------------ | --------------------------- |
| `DB`                   | `D1Database`             | Primary database            |
| `KV`                   | `KVNamespace`            | Key-value cache             |
| `ASSETS`               | `Fetcher`                | Static asset serving        |
| `BridgeAgent`          | `DurableObjectNamespace` | WebSocket relay DO          |
| `STRIPE_SECRET_KEY`    | `string`                 | Stripe API key              |
| `GITHUB_CLIENT_ID`     | `string`                 | GitHub OAuth client ID      |
| `GITHUB_CLIENT_SECRET` | `string`                 | GitHub OAuth client secret  |
| `TURNSTILE_SECRET_KEY` | `string`                 | Cloudflare Turnstile secret |
| `BETTER_AUTH_SECRET`   | `string`                 | Better Auth signing secret  |

### Environment Variables

Set in `wrangler.jsonc` of the consuming worker ([`@happy-vibecode/web`](../../apps/web/)).

## Dependencies

### Internal

| Package                                | Purpose                                 |
| -------------------------------------- | --------------------------------------- |
| [`@happy-vibecode/db`](../db/)         | Drizzle ORM schemas and D1 `createDb()` |
| [`@happy-vibecode/shared`](../shared/) | Zod validation schemas and shared types |

### External

| Package               | Purpose                               |
| --------------------- | ------------------------------------- |
| `hono` ^4.12.9        | Lightweight web framework for Workers |
| `drizzle-orm` ^0.44.2 | Type-safe D1 database access          |
| `zod` ^4.3.6          | Runtime request validation            |

## Scripts

| Script      | Command        | Description                  |
| ----------- | -------------- | ---------------------------- |
| `typecheck` | `tsc --noEmit` | Run TypeScript type checking |

## Examples

### Adding a New Route

Create a new file in `src/routes/`:

```typescript
// src/routes/example.ts
import type {ApiEnv} from '../middleware/auth'
import {auth} from '../middleware/auth'
import {Hono} from 'hono'

const example = new Hono<ApiEnv>()

example.get('/', auth, async c => {
	const user = c.get('user')
	const db = c.get('db')

	const data = await db.select().from(/* ... */)
	return c.json({data})
})

export default example
```

Then mount it in `src/index.ts`:

```typescript
import example from './routes/example'

api.route('/example', example)
```

### Using Audit Logging

```typescript
import {logAuditEvent} from '../lib/audit'

// In a route handler:
await logAuditEvent(c, {
	targetId: targetUser.id,
	action: 'user.suspend',
	details: {reason: 'Terms of service violation'},
})
```

### Password Hashing

```typescript
import {hashPassword, verifyPassword} from '../utils/password'

const hashed = await hashPassword('my-secret-password')
const isValid = await verifyPassword('my-secret-password', hashed)
```

## Troubleshooting

### `DB binding not found` error

Ensure the D1 database binding is configured in the consuming worker's `wrangler.jsonc`. The binding name must be `DB`.

### Auth middleware returns 401

The Bearer token must be sent in the `Authorization` header:

```
Authorization: Bearer <api-token>
```

Verify the token exists in the `users` table and the user status is `active`.

### Zod validation errors

Request bodies are validated against Zod schemas from `@happy-vibecode/shared`. Check that the request body matches the expected shape. Validation errors return a `400` status with details in the response.

### Drizzle query errors after schema changes

After modifying `@happy-vibecode/db/src/schema.ts`, run:

```bash
bun run -F @happy-vibecode/db generate
bun run -F @happy-vibecode/db migrate
```

## Contributing

See the root [CONTRIBUTING.md](../../README.md#contributing) for general guidelines.

For this package specifically:

- One route file per domain in `src/routes/`
- Use Zod schemas from `@happy-vibecode/shared` for all request validation
- Use `@happy-vibecode/db` for all database access
- Add audit logging for all admin mutations
- Run `bun run typecheck` before submitting changes
- Keep middleware composable — auth before admin checks

## License

This project is part of the [Happy Vibecode](../../README.md) monorepo. See the root LICENSE file for details.
