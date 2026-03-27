# @happy-vibecode/shared

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![TypeScript](https://img.shields.io/badge/types-TypeScript-blue)
![Validation](https://img.shields.io/badge/validation-Zod%20v4-purple)
![License](https://img.shields.io/badge/license-MIT-green)

Shared types, Zod validation schemas, and utility functions used across all Happy Vibecode packages. Single source of truth for API contracts, data shapes, and validation rules.

## Table of Contents

- [Getting Started](#getting-started)
- [Features](#features)
- [Exports](#exports)
- [Schema Modules](#schema-modules)
- [Utilities](#utilities)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Dependencies](#dependencies)
- [Scripts](#scripts)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Getting Started

### Installation

```bash
# From the monorepo root
bun install
```

### Usage

```typescript
// Main entry — re-exports all modules
import {
	userSchema,
	createWorkspaceSchema,
	wsMessageSchema,
} from '@happy-vibecode/shared'

// Subpath imports for specific modules
import {
	adminUserSchema,
	permissionsSchema,
} from '@happy-vibecode/shared/schema/admin'
import {userSchema, planTierSchema} from '@happy-vibecode/shared/schema/user'
import {hashPassword, verifyPassword} from '@happy-vibecode/shared/crypto'
import {createTicketSchema} from '@happy-vibecode/shared/schema/ticket'
```

### Type Checking

```bash
bun run -F @happy-vibecode/shared typecheck
```

## Features

- **Zod validation schemas** — Runtime validation for all API inputs and data shapes
- **TypeScript types** — Inferred from Zod schemas for type-safe development
- **WebSocket message types** — Discriminated union for all WS message types
- **Password utilities** — Cross-runtime (Bun/WebCrypto) PBKDF2-SHA256 hashing
- **Subpath exports** — Import only what you need via `@happy-vibecode/shared/*`

## Exports

### Package Exports (`package.json`)

| Export Path                            | File                     | Description                       |
| -------------------------------------- | ------------------------ | --------------------------------- |
| `@happy-vibecode/shared`               | `./src/index.ts`         | All schemas, types, and utilities |
| `@happy-vibecode/shared/crypto`        | `./src/crypto.ts`        | Password hashing utilities        |
| `@happy-vibecode/shared/schema/user`   | `./src/schema/user.ts`   | User-related schemas              |
| `@happy-vibecode/shared/schema/ticket` | `./src/schema/ticket.ts` | Ticket schemas                    |
| `@happy-vibecode/shared/schema/admin`  | `./src/schema/admin.ts`  | Admin schemas                     |

### Main Index (`src/index.ts`)

Re-exports everything from:

- `./schema/user`
- `./schema/agent-session`
- `./schema/message`
- `./schema/device-token`
- `./schema/llm-provider`
- `./schema/ticket`
- `./schema/admin`
- `./crypto`

## Schema Modules

### `schema/user.ts`

User account, preferences, subscription, and authentication schemas.

| Schema                     | Type                 | Description                                                                  |
| -------------------------- | -------------------- | ---------------------------------------------------------------------------- |
| `userPreferencesSchema`    | `UserPreferences`    | Theme, notifications, language settings                                      |
| `planTierSchema`           | `PlanTier`           | `free` \| `pro`                                                              |
| `subscriptionStatusSchema` | `SubscriptionStatus` | `inactive` \| `trialing` \| `active` \| `past_due` \| `canceled` \| `unpaid` |
| `userSubscriptionSchema`   | `UserSubscription`   | Subscription details with plan tier and status                               |
| `userSchema`               | `User`               | Full user object                                                             |
| `authTokenSchema`          | `AuthToken`          | API token with user ID                                                       |
| `createUserSchema`         | `CreateUser`         | Registration input validation                                                |
| `updateProfileSchema`      | `UpdateProfile`      | Profile update input                                                         |
| `setPasswordSchema`        | `SetPassword`        | Set password for OAuth users                                                 |
| `changePasswordSchema`     | `ChangePassword`     | Change existing password                                                     |
| `linkEmailSchema`          | `LinkEmail`          | Link email to account                                                        |
| `loginWithPasswordSchema`  | `LoginWithPassword`  | Email/password login                                                         |

### `schema/agent-session.ts`

Agent session and connection status schemas.

| Schema                     | Type                 | Description                                              |
| -------------------------- | -------------------- | -------------------------------------------------------- |
| `connectionStatusSchema`   | `ConnectionStatus`   | `connecting` \| `connected` \| `disconnected` \| `error` |
| `agentSessionSchema`       | `AgentSession`       | Full session object                                      |
| `createAgentSessionSchema` | `CreateAgentSession` | Session creation input                                   |

**Types:**

- `AgentType` — `gemini` | `claude` | `codex` | `opencode-ai` | `copilot` | `kilo` | `cline` | `custom`

### `schema/message.ts`

Chat messages and WebSocket message types.

| Schema                | Type            | Description                                 |
| --------------------- | --------------- | ------------------------------------------- |
| `messageRoleSchema`   | `MessageRole`   | `user` \| `assistant` \| `system` \| `tool` |
| `messageSchema`       | `Message`       | Full message object                         |
| `createMessageSchema` | `CreateMessage` | Message creation input                      |
| `wsMessageSchema`     | `WsMessage`     | WebSocket message (discriminated union)     |

**WebSocket Message Types** (`wsMessageSchema` discriminated union):

| Type        | Direction      | Fields                           |
| ----------- | -------------- | -------------------------------- |
| `prompt`    | Client → Agent | `content`, `sessionId`           |
| `response`  | Agent → Client | `content`, `sessionId`, `model?` |
| `error`     | Bidirectional  | `error`, `sessionId?`            |
| `status`    | Bidirectional  | `status`, `sessionId?`           |
| `ping`      | Bidirectional  | `timestamp`                      |
| `pong`      | Bidirectional  | `timestamp`                      |
| `workspace` | Client → Agent | `workspaceId`, `path`            |
| `model`     | Client → Agent | `model`, `provider?`             |

### `schema/device-token.ts`

Push notification device token schemas.

| Schema                    | Type                | Description                 |
| ------------------------- | ------------------- | --------------------------- |
| `devicePlatformSchema`    | `DevicePlatform`    | `ios` \| `android` \| `web` |
| `deviceTokenSchema`       | `DeviceToken`       | Full device token object    |
| `createDeviceTokenSchema` | `CreateDeviceToken` | Token registration input    |

### `schema/llm-provider.ts`

LLM provider, workspace, agent, and configuration schemas.

| Schema                  | Type              | Description                                                                                    |
| ----------------------- | ----------------- | ---------------------------------------------------------------------------------------------- |
| `llmProviderSchema`     | `LLMProvider`     | `gemini` \| `claude` \| `codex` \| `opencode-ai` \| `copilot` \| `kilo` \| `cline` \| `custom` |
| `workspaceSchema`       | `Workspace`       | Full workspace object                                                                          |
| `agentConfigSchema`     | `AgentConfig`     | Agent CLI configuration                                                                        |
| `agentSchema`           | `Agent`           | Full agent definition                                                                          |
| `createWorkspaceSchema` | `CreateWorkspace` | Workspace creation input                                                                       |
| `updateWorkspaceSchema` | `UpdateWorkspace` | Workspace update input                                                                         |
| `createAgentSchema`     | `CreateAgent`     | Agent creation input                                                                           |
| `updateAgentSchema`     | `UpdateAgent`     | Agent update input                                                                             |

### `schema/ticket.ts`

Support ticket schemas.

| Schema                     | Type                 | Description                                             |
| -------------------------- | -------------------- | ------------------------------------------------------- |
| `ticketTopicSchema`        | `TicketTopic`        | `bug` \| `feature` \| `billing` \| `general` \| `other` |
| `ticketStatusSchema`       | `TicketStatus`       | `open` \| `closed`                                      |
| `ticketSchema`             | `Ticket`             | Full ticket object                                      |
| `ticketDetailSchema`       | `TicketDetail`       | Ticket with responses                                   |
| `createTicketSchema`       | `CreateTicket`       | Ticket creation input                                   |
| `ticketResponseSchema`     | `TicketResponse`     | Ticket reply input                                      |
| `updateTicketStatusSchema` | `UpdateTicketStatus` | Status update input                                     |

### `schema/admin.ts`

Admin dashboard, RBAC, analytics, and audit schemas.

| Schema                       | Type                   | Description                          |
| ---------------------------- | ---------------------- | ------------------------------------ |
| `userStatusSchema`           | `UserStatus`           | `active` \| `suspended` \| `pending` |
| `adminUserSchema`            | `AdminUser`            | User object for admin views          |
| `adminUserListSchema`        | `AdminUserList`        | Paginated user list                  |
| `createUserAdminSchema`      | `CreateUserAdmin`      | Admin user creation                  |
| `updateUserAdminSchema`      | `UpdateUserAdmin`      | Admin user update                    |
| `updateUserStatusSchema`     | `UpdateUserStatus`     | Status change                        |
| `userSettingsOverrideSchema` | `UserSettingsOverride` | Settings override                    |
| `permissionsSchema`          | `Permissions`          | Permission matrix                    |
| `roleSchema`                 | `Role`                 | RBAC role                            |
| `createRoleSchema`           | `CreateRole`           | Role creation                        |
| `updateRoleSchema`           | `UpdateRole`           | Role update                          |
| `bulkAssignRoleSchema`       | `BulkAssignRole`       | Bulk role assignment                 |
| `dateRangeSchema`            | `DateRange`            | Analytics date range                 |
| `analyticsOverviewSchema`    | `AnalyticsOverview`    | Dashboard metrics                    |
| `signupTrendSchema`          | `SignupTrend`          | Signup trend data                    |
| `roleDistributionSchema`     | `RoleDistribution`     | Role distribution data               |
| `sessionMetricSchema`        | `SessionMetric`        | Session metrics                      |
| `loginHeatmapSchema`         | `LoginHeatmap`         | Login heatmap data                   |
| `auditLogSchema`             | `AuditLog`             | Audit log entry                      |
| `auditLogListSchema`         | `AuditLogList`         | Paginated audit logs                 |

**Permission Modules:**

```typescript
const permissionModules = [
	'users',
	'roles',
	'sessions',
	'workspaces',
	'tickets',
	'analytics',
	'audit',
] as const

const permissionActions = ['read', 'write', 'delete'] as const
```

## Utilities

### `crypto.ts`

Cross-runtime password hashing using PBKDF2-SHA256.

| Function         | Signature                                                    | Description                        |
| ---------------- | ------------------------------------------------------------ | ---------------------------------- |
| `hashPassword`   | `(password: string) => Promise<string>`                      | Hash a password with PBKDF2-SHA256 |
| `verifyPassword` | `(password: string, storedHash: string) => Promise<boolean>` | Verify a password against a hash   |

Uses `Bun.password` when available (Bun runtime), falls back to WebCrypto PBKDF2 (Cloudflare Workers, Node.js, browsers).

## Architecture

### Design Decisions

- **Schema-first** — Zod schemas are the single source of truth; TypeScript types are inferred from them
- **Subpath exports** — Consumers can import only the modules they need, reducing bundle size
- **No runtime dependencies on platform** — Crypto utilities detect and adapt to Bun, WebCrypto, or Node.js
- **Discriminated unions** — WebSocket messages use Zod discriminated unions for type-safe message parsing
- **Separate schema modules** — Each domain (user, ticket, admin, etc.) has its own file for maintainability

### Dependency Graph

```
@happy-vibecode/shared  (no internal deps)
        ↑
@happy-vibecode/api     (imports schemas for validation)
@happy-vibecode/cli     (imports types for CLI config)
@happy-vibecode/web     (imports directly for frontend validation)
```

## Project Structure

```
packages/shared/
├── src/
│   ├── index.ts                  # Re-exports all modules
│   ├── crypto.ts                 # hashPassword/verifyPassword
│   └── schema/
│       ├── user.ts               # User, preferences, subscription, auth schemas
│       ├── agent-session.ts      # Agent session, connection status schemas
│       ├── message.ts            # Message, WebSocket message schemas
│       ├── device-token.ts       # Device token schemas
│       ├── llm-provider.ts       # LLM provider, workspace, agent schemas
│       ├── ticket.ts             # Ticket, response schemas
│       └── admin.ts              # Admin user, role, permissions, analytics, audit schemas
├── tsconfig.json
└── package.json
```

## Dependencies

### External

| Package         | Purpose                                      |
| --------------- | -------------------------------------------- |
| `zod` ^4.3.6    | Runtime schema validation and type inference |
| `crypto` ^1.0.1 | Node.js crypto module (for PBKDF2 fallback)  |

### Dev Dependencies

| Package              | Purpose                      |
| -------------------- | ---------------------------- |
| `@types/bun` ^1.3.11 | Bun runtime type definitions |
| `typescript` ^5      | Type checking                |
| `oxlint`             | Fast linting                 |

### Consumers

| Package                                  | Usage                                             |
| ---------------------------------------- | ------------------------------------------------- |
| [`@happy-vibecode/api`](../api/)         | Request validation, type definitions              |
| [`@happy-vibecode/cli`](../cli/)         | CLI config types, LLM provider types              |
| [`@happy-vibecode/web`](../../apps/web/) | Frontend form validation, WebSocket message types |

## Scripts

| Script      | Command        | Description              |
| ----------- | -------------- | ------------------------ |
| `lint`      | `oxlint`       | Lint source files        |
| `lint:fix`  | `oxlint --fix` | Lint and auto-fix        |
| `typecheck` | `tsc --noEmit` | TypeScript type checking |

## Examples

### Validating API Input

```typescript
import {createUserSchema} from '@happy-vibecode/shared'

// In a Hono route handler:
app.post('/register', async c => {
	const body = await c.req.json()
	const result = createUserSchema.safeParse(body)

	if (!result.success) {
		return c.json({errors: result.error.issues}, 400)
	}

	// result.data is fully typed as CreateUser
	const {email, password} = result.data
	// ...
})
```

### Parsing WebSocket Messages

```typescript
import {wsMessageSchema} from '@happy-vibecode/shared'

function handleMessage(raw: string) {
	const parsed = wsMessageSchema.safeParse(JSON.parse(raw))

	if (!parsed.success) return

	switch (parsed.data.type) {
		case 'prompt':
			console.log('User prompt:', parsed.data.content)
			break
		case 'response':
			console.log('Agent response:', parsed.data.content)
			break
		case 'error':
			console.error('Error:', parsed.data.error)
			break
		case 'ping':
			// Respond with pong
			ws.send(JSON.stringify({type: 'pong', timestamp: Date.now()}))
			break
	}
}
```

### Using Password Utilities

```typescript
import {hashPassword, verifyPassword} from '@happy-vibecode/shared/crypto'

const hash = await hashPassword('my-secret-password')
const isValid = await verifyPassword('my-secret-password', hash)
// isValid === true
```

### Type-Safe Permissions

```typescript
import {
	permissionsSchema,
	permissionModules,
	permissionActions,
} from '@happy-vibecode/shared'

// Build a permissions object
const permissions = Object.fromEntries(
	permissionModules.map(module => [
		module,
		Object.fromEntries(permissionActions.map(action => [action, false])),
	]),
)

// Grant specific permissions
permissions.users.read = true
permissions.users.write = true
permissions.analytics.read = true

// Validate
const validated = permissionsSchema.parse(permissions)
```

### Creating a Ticket

```typescript
import {createTicketSchema} from '@happy-vibecode/shared'

const ticket = createTicketSchema.parse({
	title: 'Agent not responding',
	topic: 'bug',
})

// ticket is typed as CreateTicket
// { title: string, topic: "bug" | "feature" | "billing" | "general" | "other" }
```

## Troubleshooting

### `ZodError` on valid-looking input

Check the schema definition for the specific field. Common issues:

- Missing required fields — check if the schema uses `.optional()`
- Invalid enum values — ensure the value matches one of the schema's enum options
- Type mismatches — e.g., passing a string where a number is expected

### Import resolution errors with subpath exports

Ensure your bundler/framework supports package `exports` field. For older tools, import from the main entry:

```typescript
// If subpath fails:
// Instead of:
import {hashPassword} from '@happy-vibecode/shared/crypto'
import {hashPassword} from '@happy-vibecode/shared'
```

### Crypto function throws in Cloudflare Workers

The `crypto.ts` module falls back to WebCrypto (`globalThis.crypto.subtle`) when `Bun.password` is not available. Ensure your Workers environment has the WebCrypto API enabled (it is by default).

## Contributing

See the root [CONTRIBUTING.md](../../README.md#contributing) for general guidelines.

For this package specifically:

- One schema file per domain in `src/schema/`
- Every schema must have an inferred TypeScript type exported alongside it
- Use `z.enum()` for fixed string sets (roles, statuses, providers)
- Use discriminated unions for polymorphic data (WebSocket messages)
- Export new modules from `src/index.ts`
- Run `bun run typecheck` and `bun run lint` before submitting changes
- Update the Schema Modules section of this README when adding new schemas

## License

This project is part of the [Happy Vibecode](../../README.md) monorepo. See the root LICENSE file for details.
