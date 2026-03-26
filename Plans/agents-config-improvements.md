# Agents Configuration Improvements Plan

## Context

The CLI currently hardcodes agent definitions in `agents-config.ts` and `llm-provider.ts`. Agent execution in `connect.ts` relies on `agent.workspaceFlag` to pass the working directory, but many agents (codex, opencode-ai, copilot, kilo, cline) don't have a workspace flag. The plan is to:

1. Change agent execution to use `cd 'path' && agent 'prompt'` for universal workspace support
2. Store agents in D1 database for admin-configurable agent management
3. Make `agent_sessions.agent_type` a free-text field to support dynamic agents
4. Fix an unused variable eslint warning in profile page

---

## Task 1: Fix ESLint Unused Variable

**File**: `apps/web/app/profile/page.tsx:117`

**Change**: Rename `updated` to `_updated` (or remove the assignment if the response isn't needed).

The line `const updated = (await res.json()) as UserProfile` is unused — the response body isn't used after a successful save. Rename to `_updated` to satisfy the `no-unused-vars` rule.

---

## Task 2: Change Agent Execution to `cd && agent` Pattern

**File**: `packages/cli/src/commands/connect.ts`

**Current behavior** (`runAgent` function, lines 102-162):

- If `agent.workspaceFlag` exists and workspace is provided, pushes `agent.workspaceFlag` + workspace path to args
- Many agents don't have `workspaceFlag`, so workspace is ignored
- Uses `cwd` option in `spawn` which works but agents may not respect it

**New behavior**:

- Remove the `workspaceFlag` arg logic entirely
- Use shell command pattern: `cd "workspace_path" && agent_command args`
- When no workspace: just run `agent_command args` as before
- This works universally since all shells support `cd &&` chaining

**Implementation**:

```typescript
// In runAgent():
// Remove workspaceFlag arg logic (lines 113-115)
// Build command string:

const promptFlag = agent.promptFlag || '-p'
const quotedPrompt = prompt.replace(/"/g, '\\"')
args.push(promptFlag, `"${quotedPrompt}"`)
const fullArgs = [...agent.args, ...args]
const agentCmd = [agent.command, ...fullArgs].join(' ')

const cmdStr = workspace ? `cd "${workspace}" && ${agentCmd}` : agentCmd

const proc = spawn(cmdStr, {
	stdio: ['ignore', 'pipe', 'pipe'],
	shell: true,
	// Remove cwd since we handle it via cd
})
```

Also update `packages/cli/src/types/llm-provider.ts`:

- Remove `workspaceFlag` from `LLMProviderConfig` (optional, could keep for backward compat)
- Remove `workspaceFlag` from `AgentDefinition` (optional, could keep)

Also update `packages/cli/src/utils/agents-config.ts`:

- Remove `workspaceFlag` fields from agent definitions (they're no longer used)

---

## Task 3: Add Agents Table to D1 Database

### 3a. DB Schema

**File**: `packages/db/src/schema.ts`

Add new table:

```typescript
export const agents = sqliteTable('agents', {
	id: text('id').primaryKey(), // UUID
	name: text('name').notNull(),
	command: text('command').notNull(),
	args: text('args').notNull(), // JSON array: ["--flag1", "--flag2"]
	promptFlag: text('prompt_flag'),
	modelFlag: text('model_flag'),
	description: text('description'),
	isActive: integer('is_active', {mode: 'boolean'}).default(true),
	createdAt: integer('created_at', {mode: 'timestamp_ms'}).notNull(),
	updatedAt: integer('updated_at', {mode: 'timestamp_ms'}).notNull(),
})
```

### 3b. Drizzle Migration

**Action**: Run `bun run -F @happy-vibecode/db generate` to create migration file in `packages/db/drizzle/0005_agents_table.sql`.

The migration will:

1. Create the new `agents` table
2. Alter `agent_sessions.agent_type` from enum to text (SQLite requires table recreation for column type changes — Drizzle Kit handles this automatically)

### 3c. Shared Schema (Zod)

**File**: `packages/shared/src/schema/llm-provider.ts`

Add agent CRUD schemas:

```typescript
export const agentSchema = z.object({
	id: z.string(),
	name: z.string().min(1),
	command: z.string().min(1),
	args: z.array(z.string()),
	promptFlag: z.string().nullable().optional(),
	modelFlag: z.string().nullable().optional(),
	description: z.string().nullable().optional(),
	isActive: z.boolean().optional(),
	createdAt: z.string().optional(),
	updatedAt: z.string().optional(),
})

export const createAgentSchema = agentSchema.omit({
	id: true,
	createdAt: true,
	updatedAt: true,
})

export const updateAgentSchema = agentSchema.partial()
```

Export from `packages/shared/src/index.ts` (already exported via `llm-provider.js`).

### 3d. API Routes

**File**: `packages/api/src/routes/agents.ts` (new file)

CRUD endpoints following the same pattern as `workspaces.ts`:

| Method | Path              | Description                     |
| ------ | ----------------- | ------------------------------- |
| GET    | `/api/agents`     | List all active agents          |
| POST   | `/api/agents`     | Create a new agent (admin only) |
| GET    | `/api/agents/:id` | Get agent by ID                 |
| PUT    | `/api/agents/:id` | Update agent                    |
| DELETE | `/api/agents/:id` | Delete agent (admin only)       |

**File**: `packages/api/src/index.ts`

Mount: `api.route('/agents', agentsRouter)`

### 3e. CLI Changes — Fetch Agents from API

**File**: `packages/cli/src/commands/connect.ts`

Update `loadAgentsConfig()` and related functions to:

1. First try fetching agents from the API (`GET /api/agents`)
2. Fall back to the local `~/.happy/agents.json` file (or hardcoded defaults)
3. This keeps the CLI functional offline while enabling central agent management

---

## Task 4: Make agent_sessions.agent_type Free-Text

The `agent_sessions` table currently uses a hardcoded enum for `agent_type`. With dynamic agents from D1, this needs to become a free-text field.

### 4a. DB Schema Change

**File**: `packages/db/src/schema.ts`

Change `agentSessions.agentType` from enum to text:

```typescript
// Before:
agentType: text('agent_type', {
  enum: ['claude', 'gemini', 'codex', 'opencode', 'opencode-ai', 'copilot', 'kilo', 'cline', 'custom'],
}).notNull(),

// After:
agentType: text('agent_type').notNull(),
```

### 4b. Shared Schema Change

**File**: `packages/shared/src/schema/agent-session.ts`

Change `agentTypeSchema` from enum to string:

```typescript
// Before:
export const agentTypeSchema = z.enum([
	'claude',
	'gemini',
	'codex',
	'opencode',
	'custom',
])

// After:
export const agentTypeSchema = z.string().min(1)
```

### 4c. Migration

The migration generated in Task 3b will include this schema change along with the new agents table.

---

## Files Modified Summary

| File                                          | Change                                               |
| --------------------------------------------- | ---------------------------------------------------- |
| `apps/web/app/profile/page.tsx`               | Fix unused variable (`updated` -> `_updated`)        |
| `packages/cli/src/commands/connect.ts`        | `cd &&` pattern for workspace, fetch agents from API |
| `packages/cli/src/utils/agents-config.ts`     | Remove `workspaceFlag` fields                        |
| `packages/cli/src/types/llm-provider.ts`      | Remove `workspaceFlag` from types                    |
| `packages/db/src/schema.ts`                   | Add `agents` table, change `agentType` to text       |
| `packages/db/drizzle/0005_agents_table.sql`   | New migration (auto-generated)                       |
| `packages/shared/src/schema/llm-provider.ts`  | Add agent Zod schemas                                |
| `packages/shared/src/schema/agent-session.ts` | Change `agentTypeSchema` from enum to string         |
| `packages/api/src/routes/agents.ts`           | New agents CRUD API route                            |
| `packages/api/src/index.ts`                   | Mount agents router                                  |

## Verification

1. Run `bun run typecheck` — ensure no type errors across all packages
2. Run `bun run lint:fix` — verify eslint fix for profile page
3. Run `bun run -F @happy-vibecode/db generate` — generate migration
4. Review generated migration in `packages/db/drizzle/` for correctness
5. Run `bun run -F @happy-vibecode/db migrate` — apply migration locally
6. Verify the `connect.ts` `cd &&` pattern works by checking command construction logic
