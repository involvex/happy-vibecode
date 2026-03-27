# @happy-vibecode/db

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![ORM](https://img.shields.io/badge/ORM-Drizzle-orange)
![Database](<https://img.shields.io/badge/database-Cloudflare%20D1%20(SQLite)-green>)
![License](https://img.shields.io/badge/license-MIT-green)

Database layer for the Happy Vibecode platform. Provides Drizzle ORM schema definitions, migration files, and a `createDb()` factory for Cloudflare D1 (SQLite) databases. Single source of truth for the database structure across all packages.

## Table of Contents

- [Getting Started](#getting-started)
- [Schema](#schema)
- [Usage](#usage)
- [Migrations](#migrations)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Dependencies](#dependencies)
- [Scripts](#scripts)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) 1.3.x
- Cloudflare Workers environment with D1 binding
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) CLI

### Installation

```bash
# From the monorepo root
bun install
```

### Usage

```typescript
import {createDb} from '@happy-vibecode/db'

// In a Cloudflare Worker with D1 binding:
export default {
	async fetch(request, env) {
		const db = createDb(env.DB)
		const users = await db.select().from(schema.users)
		return Response.json(users)
	},
}
```

### Type Checking

```bash
bun run -F @happy-vibecode/db typecheck
```

## Schema

The database contains 13 tables organized into functional groups.

### Core Tables

| Table            | Description                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| `users`          | User accounts — email, password hash, API token, GitHub ID, role, status, plan tier, Stripe customer/subscription IDs |
| `workspaces`     | User workspaces — name, filesystem path, default provider/model, active flag                                          |
| `agent_sessions` | Active agent sessions — agent type, connection status, room ID, workspace ID, model                                   |
| `message_logs`   | Chat message history — session ID, role (user/assistant/system/tool), content, timestamp                              |

### Authentication Tables (Better Auth)

| Table              | Description                     |
| ------------------ | ------------------------------- |
| `authUser`         | Better Auth user records        |
| `authSession`      | Better Auth sessions            |
| `authAccount`      | Better Auth OAuth account links |
| `authVerification` | Better Auth verification tokens |

### Feature Tables

| Table              | Description                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------- |
| `device_tokens`    | Push notification tokens — user ID, token, platform (ios/android/web)                       |
| `tickets`          | Support tickets — user ID, title, topic (bug/feature/billing/general), status (open/closed) |
| `ticket_responses` | Ticket reply messages                                                                       |
| `agents`           | Agent definitions — name, command, args, prompt flag, model flag, description, active flag  |

### Admin Tables

| Table        | Description                                                     |
| ------------ | --------------------------------------------------------------- |
| `roles`      | RBAC roles — name, permissions (JSON object)                    |
| `audit_logs` | Admin audit trail — actor ID, target ID, action, details (JSON) |

### Key Columns

#### `users`

| Column                 | Type          | Description                                       |
| ---------------------- | ------------- | ------------------------------------------------- |
| `id`                   | text (PK)     | Unique user ID                                    |
| `email`                | text (unique) | User email address                                |
| `passwordHash`         | text          | PBKDF2-SHA256 password hash                       |
| `apiToken`             | text (unique) | API token for CLI access                          |
| `githubId`             | text          | GitHub OAuth user ID                              |
| `role`                 | text          | User role (default: `user`)                       |
| `status`               | text          | Account status (`active`, `suspended`, `pending`) |
| `planTier`             | text          | Subscription tier (`free`, `pro`)                 |
| `stripeCustomerId`     | text          | Stripe customer ID                                |
| `stripeSubscriptionId` | text          | Stripe subscription ID                            |

#### `workspaces`

| Column            | Type      | Description                 |
| ----------------- | --------- | --------------------------- |
| `id`              | text (PK) | Unique workspace ID         |
| `userId`          | text (FK) | Owner user ID               |
| `name`            | text      | Workspace display name      |
| `path`            | text      | Filesystem path             |
| `defaultProvider` | text      | Default LLM provider        |
| `defaultModel`    | text      | Default model name          |
| `isActive`        | integer   | Active workspace flag (0/1) |

#### `agent_sessions`

| Column             | Type      | Description                                         |
| ------------------ | --------- | --------------------------------------------------- |
| `id`               | text (PK) | Unique session ID                                   |
| `userId`           | text (FK) | Owner user ID                                       |
| `agentType`        | text      | Agent type (gemini, claude, etc.)                   |
| `connectionStatus` | text      | Status (connecting, connected, disconnected, error) |
| `roomId`           | text      | BridgeAgent room ID                                 |
| `workspaceId`      | text (FK) | Associated workspace                                |
| `model`            | text      | Model used for session                              |

## Usage

### Creating a Database Instance

```typescript
import {createDb, type Database} from '@happy-vibecode/db'

// In a Cloudflare Worker:
function getDb(env: {DB: D1Database}): Database {
	return createDb(env.DB)
}
```

### Importing Schema

```typescript
import {schema} from '@happy-vibecode/db'

// Or import individual tables:
import {users, workspaces, agentSessions} from '@happy-vibecode/db'
```

### Querying

```typescript
import {createDb, schema} from '@happy-vibecode/db'
import {eq} from 'drizzle-orm'

const db = createDb(env.DB)

// Select all users
const allUsers = await db.select().from(schema.users)

// Find user by email
const user = await db
	.select()
	.from(schema.users)
	.where(eq(schema.users.email, 'user@example.com'))
	.get()

// Insert a workspace
await db.insert(schema.workspaces).values({
	id: crypto.randomUUID(),
	userId: user.id,
	name: 'My Project',
	path: '/home/user/project',
})
```

## Migrations

Migrations are managed with [Drizzle Kit](https://orm.drizzle.team/kit-overview) and stored in the `drizzle/` directory.

### Generating Migrations

After modifying `src/schema.ts`:

```bash
bun run -F @happy-vibecode/db generate
```

This creates a new SQL migration file in `drizzle/`.

### Reviewing Migrations

Always review generated migrations before applying:

```bash
cat drizzle/<migration_name>.sql
```

### Applying Migrations

```bash
bun run -F @happy-vibecode/db migrate
```

### Migration History

| File                              | Description                                                               |
| --------------------------------- | ------------------------------------------------------------------------- |
| `0000_initial.sql`                | Core tables (users, workspaces, agent_sessions, message_logs)             |
| `0001_github_oauth.sql`           | GitHub OAuth fields on users                                              |
| `0002_user_profile.sql`           | User profile fields                                                       |
| `0003_user_roles_and_tickets.sql` | Roles, tickets, ticket_responses tables                                   |
| `0004_admin_dashboard.sql`        | Audit logs, analytics support                                             |
| `0005_agents_table.sql`           | Agent definitions table                                                   |
| `0006_better_auth.sql`            | Better Auth tables (authUser, authSession, authAccount, authVerification) |
| `0007_seed_agents.sql`            | Seed default agent definitions                                            |
| `0008_subscriptions.sql`          | Subscription and Stripe fields                                            |

### Drizzle Configuration (`drizzle.config.ts`)

```typescript
import {defineConfig} from 'drizzle-kit'

export default defineConfig({
	dialect: 'sqlite',
	schema: './src/schema.ts',
	out: './drizzle',
})
```

## Architecture

### Design Decisions

- **Drizzle ORM** — Type-safe queries with excellent D1 support, lightweight compared to Prisma
- **SQLite dialect** — D1 is SQLite-based, so all schema definitions use SQLite types
- **Separate auth tables** — Better Auth requires its own table structure, kept separate from the main `users` table for flexibility
- **JSON columns for permissions** — Role permissions stored as JSON objects for flexible RBAC
- **No foreign key constraints** — D1 has limited FK support; relationships enforced at the application layer

### Data Flow

```
@happy-vibecode/api  →  createDb(env.DB)  →  Drizzle ORM  →  D1 (SQLite)
                         ↑
@happy-vibecode/db   (schema + factory)
```

## Project Structure

```
packages/db/
├── src/
│   ├── index.ts          # createDb(), Database type, re-exports schema
│   └── schema.ts         # All table definitions (13 tables)
├── drizzle/
│   ├── 0000_initial.sql
│   ├── 0001_github_oauth.sql
│   ├── 0002_user_profile.sql
│   ├── 0003_user_roles_and_tickets.sql
│   ├── 0004_admin_dashboard.sql
│   ├── 0005_agents_table.sql
│   ├── 0006_better_auth.sql
│   ├── 0007_seed_agents.sql
│   ├── 0008_subscriptions.sql
│   └── meta/             # Drizzle migration metadata
├── drizzle.config.ts     # Drizzle Kit configuration
├── tsconfig.json
└── package.json
```

## Dependencies

### External

| Package                                         | Purpose                             |
| ----------------------------------------------- | ----------------------------------- |
| `drizzle-orm` ^0.44.2                           | Type-safe ORM for D1/SQLite         |
| `drizzle-kit` ^0.31.4 (dev)                     | Migration generation and management |
| `@cloudflare/workers-types` ^4.20250712.0 (dev) | Cloudflare Workers type definitions |

### Consumers

| Package                                  | Usage                                   |
| ---------------------------------------- | --------------------------------------- |
| [`@happy-vibecode/api`](../api/)         | All database queries via `createDb()`   |
| [`@happy-vibecode/web`](../../apps/web/) | Imports for Better Auth Drizzle adapter |

## Scripts

| Script      | Command                | Description                            |
| ----------- | ---------------------- | -------------------------------------- |
| `generate`  | `drizzle-kit generate` | Generate migration from schema changes |
| `migrate`   | `drizzle-kit migrate`  | Apply pending migrations               |
| `typecheck` | `tsc --noEmit`         | TypeScript type checking               |

## Examples

### Adding a New Table

1. Add the table definition to `src/schema.ts`:

```typescript
import {sqliteTable, text, integer} from 'drizzle-orm/sqlite-core'

export const notifications = sqliteTable('notifications', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull(),
	type: text('type').notNull(), // "session_complete", "ticket_reply", etc.
	message: text('message').notNull(),
	read: integer('read').default(0),
	createdAt: text('created_at').notNull(),
})
```

2. Export it from `src/index.ts`:

```typescript
export {notifications} from './schema'
```

3. Generate and apply the migration:

```bash
bun run -F @happy-vibecode/db generate
# Review drizzle/<new_migration>.sql
bun run -F @happy-vibecode/db migrate
```

### Querying with Relations

```typescript
import {createDb, schema} from '@happy-vibecode/db'
import {eq, desc} from 'drizzle-orm'

const db = createDb(env.DB)

// Get user's workspaces
const userWorkspaces = await db
	.select()
	.from(schema.workspaces)
	.where(eq(schema.workspaces.userId, userId))
	.all()

// Get recent messages for a session
const messages = await db
	.select()
	.from(schema.messageLogs)
	.where(eq(schema.messageLogs.sessionId, sessionId))
	.orderBy(desc(schema.messageLogs.timestamp))
	.limit(50)
	.all()
```

### Using with Better Auth

The `authUser`, `authSession`, `authAccount`, and `authVerification` tables are used by Better Auth's Drizzle adapter. See [`@happy-vibecode/web/worker/auth.ts`](../../apps/web/worker/auth.ts) for the adapter configuration.

## Troubleshooting

### `D1_TYPE_ERROR` on queries

D1 uses SQLite types. Ensure `integer` columns use `integer()` from `drizzle-orm/sqlite-core`, not `serial` or `bigint`.

### Migration fails with `table already exists`

If migrations are out of sync with the actual D1 database, you may need to reset the migration history or manually reconcile. Check the `drizzle/meta` directory for migration state.

### Schema changes not reflected after migration

After running `bun run -F @happy-vibecode/db migrate`, redeploy the worker that consumes the database:

```bash
bun run deploy:web
```

### `createDb is not a function`

Ensure you're importing from `@happy-vibecode/db` (the package export), not directly from `./src/index.ts`. Check that the package's `exports` field in `package.json` is correct.

## Contributing

See the root [CONTRIBUTING.md](../../README.md#contributing) for general guidelines.

For this package specifically:

- All schema changes go in `src/schema.ts`
- Never edit migration SQL files directly — regenerate with `drizzle-kit generate`
- Always review generated migrations before committing
- Run `bun run typecheck` before submitting changes
- Add new tables to the Schema section of this README
- Update migration history table when adding new migrations

## License

This project is part of the [Happy Vibecode](../../README.md) monorepo. See the root LICENSE file for details.
