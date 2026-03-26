# Implementation Plan: CLI & LLM Provider Integration

## Overview

This plan addresses comprehensive enhancements to support multiple LLM providers (gemini-cli, claude code, opencode-ai, copilot), workspace configuration, and improved bridge connections.

---

## Phase 1: CLI Package Enhancements

### 1.1 Update packages/cli/package.json

**Changes:**

- Add `execa` for better process spawning (cross-platform, better streaming)
- Add `ora` for loading indicators
- Update scripts for better cross-platform support

**Dependencies to add:**

```json
{
	"execa": "^10.1.0",
	"ora": "^6.3.1"
}
```

### 1.2 Create Unified LLM Provider Configuration System

**New file: `packages/cli/src/types/llm-provider.ts`**

```typescript
export type LLMProvider =
	| 'gemini'
	| 'claude'
	| 'codex'
	| 'opencode-ai'
	| 'copilot'
	| 'custom'

export interface LLMProviderConfig {
	id: LLMProvider | string
	name: string
	command: string
	args: string[]
	promptFlag: string // e.g., '-p', '--prompt', '-- instructions'
	interactiveFlag?: string // e.g., '-i' for interactive mode
	workspaceFlag?: string // e.g., '--dir' for workspace
	description: string
	supportsStreaming: boolean
	modelOption?: string // e.g., '--model <name>'
}

export interface WorkspaceConfig {
	id: string
	name: string
	path: string
	defaultProvider?: string
	defaultModel?: string
}
```

### 1.3 Update Agent Definition in connect.ts and init.ts

**Changes to `packages/cli/src/commands/init.ts`:**

- Add copilot agent default
- Add opencode-ai agent default
- Add workspace configuration to agents.json

**New default agents:**

```typescript
const DEFAULT_AGENTS: AgentsConfig = {
	agents: [
		{
			id: 'gemini',
			name: 'Gemini CLI',
			command: 'gemini',
			args: [],
			description: 'Google Gemini CLI agent',
			promptFlag: '-p',
		},
		{
			id: 'claude',
			name: 'Claude Code',
			command: 'claude',
			args: [],
			description: 'Anthropic Claude CLI agent',
			promptFlag: '--instructions',
		},
		{
			id: 'codex',
			name: 'OpenAI Codex',
			command: 'codex',
			args: [],
			description: 'OpenAI Codex CLI agent',
			promptFlag: '-p',
		},
		{
			id: 'opencode-ai',
			name: 'OpenCode AI',
			command: 'opencode',
			args: [],
			description: 'OpenCode AI CLI agent',
			promptFlag: '-p',
		},
		{
			id: 'copilot',
			name: 'GitHub Copilot',
			command: 'copilot',
			args: ['ai', 'submit'],
			description: 'GitHub Copilot CLI agent',
			promptFlag: '--description',
		},
	],
	workspaces: [], // NEW
}
```

### 1.4 Enhance Bridge Connection Handling

**Changes to `packages/cli/src/commands/connect.ts`:**

1. **Add workspace directory support:**
   - Add `-d, --dir <directory>` option
   - Pass workspace directory to agent via appropriate flag

2. **Improve prompt handling:**
   - Support `-p/--prompt` option for CLI usage
   - Detect if prompt is interactive (Tty) vs piped
   - Handle non-interactive prompts properly

3. **Better error handling:**
   - Detect missing agent binary
   - Provide helpful installation suggestions
   - Handle connection failures gracefully

4. **Add model selection:**
   - Add `-m, --model <model>` option
   - Pass model to agent via provider-specific flag

**New connect command options:**

```typescript
.option('-d, --dir <directory>', 'Workspace directory to run agent in')
.option('-m, --model <model>', 'Model to use (provider-specific)')
.option('-p, --prompt <prompt>', 'Prompt to send directly (non-interactive)')
.option('-i, --interactive', 'Force interactive mode')
```

### 1.5 Create Configuration Management

**New file: `packages/cli/src/config/workspace.ts`**

```typescript
interface WorkspaceStore {
	workspaces: WorkspaceConfig[]
	activeWorkspace?: string
}

// Functions needed:
// - loadWorkspaces(): WorkspaceStore
// - saveWorkspaces(store: WorkspaceStore): void
// - addWorkspace(workspace: WorkspaceConfig): void
// - removeWorkspace(id: string): void
// - setActiveWorkspace(id: string): void
// - getActiveWorkspace(): WorkspaceConfig | undefined

// Storage: ~/.happy/workspaces.json
```

---

## Phase 2: Shared Package Updates

### 2.1 Add LLM Provider Types

**New file: `packages/shared/src/schema/llm-provider.ts`**

```typescript
import {z} from 'zod'

export const llmProviderSchema = z.enum([
	'gemini',
	'claude',
	'codex',
	'opencode-ai',
	'copilot',
	'custom',
])

export const workspaceSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1),
	path: z.string().min(1),
	defaultProvider: llmProviderSchema.optional(),
	defaultModel: z.string().optional(),
	createdAt: z.date(),
	updatedAt: z.date(),
})

export const agentConfigSchema = z.object({
	id: z.string(),
	name: z.string(),
	provider: llmProviderSchema,
	command: z.string(),
	args: z.array(z.string()),
	promptFlag: z.string(),
	modelFlag: z.string().optional(),
	workspaceFlag: z.string().optional(),
	description: z.string(),
})

export type LLMProvider = z.infer<typeof llmProviderSchema>
export type Workspace = z.infer<typeof workspaceSchema>
export type AgentConfig = z.infer<typeof agentConfigSchema>
```

### 2.2 Update agent-session schema

**Add to `packages/shared/src/schema/agent-session.ts`:**

- Add `workspaceId` field to agent sessions
- Add `model` field to agent sessions

---

## Phase 3: Database Schema Updates

### 3.1 Add Workspaces Table

**File: `packages/db/src/schema.ts`**

```typescript
export const workspaces = sqliteTable('workspaces', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id),
	name: text('name').notNull(),
	path: text('path').notNull(),
	defaultProvider: text('default_provider'),
	defaultModel: text('default_model'),
	createdAt: integer('created_at', {mode: 'timestamp'}).default(
		sql`CURRENT_TIMESTAMP`,
	),
	updatedAt: integer('updated_at', {mode: 'timestamp'}).default(
		sql`CURRENT_TIMESTAMP`,
	),
})
```

### 3.2 Update Agent Sessions

Add `workspaceId` column to `agentSessions` table, nullable for backwards compatibility.

---

## Phase 4: API Endpoints

### 4.1 Workspace API Routes

**File: `packages/api/src/routes/workspace.ts`**

```typescript
// GET /api/workspaces - List user's workspaces
// POST /api/workspaces - Create workspace
// PUT /api/workspaces/:id - Update workspace
// DELETE /api/workspaces/:id - Delete workspace
// POST /api/workspaces/:id/activate - Set active workspace
```

---

## Phase 5: Web Application Updates

### 5.1 Settings Page Enhancement

**File: `apps/web/app/settings/page.tsx`**

Add new section:

- **Workspace Configuration Panel**
  - List workspaces with directory paths
  - Add/Edit/Delete workspace
  - Set active workspace
  - Select default LLM provider per workspace

### 5.2 Workspace Selector Component

**New component: `apps/web/app/components/WorkspaceSelector.tsx`**

```tsx
interface WorkspaceSelectorProps {
	workspaces: Workspace[]
	activeWorkspace?: string
	onSelect: (workspaceId: string) => void
	onAdd: () => void
}
```

### 5.3 Update Auth Hook

**File: `apps/web/app/hooks/useAuth.ts`**

Add workspace management:

```typescript
// Add to useAuth hook:
const [workspaces, setWorkspaces] = useState<Workspace[]>([])
const [activeWorkspace, setActiveWorkspace] = useState<string | null>(null)

// Functions:
const fetchWorkspaces = async () => { ... }
const createWorkspace = async (workspace: CreateWorkspace) => { ... }
const deleteWorkspace = async (id: string) => { ... }
const setActiveWorkspaceById = async (id: string) => { ... }
```

### 5.4 Dashboard Integration

**File: `apps/web/app/dashboard/page.tsx`**

- Show active workspace indicator
- Add workspace quick-switch in header
- Display workspace-specific session history

---

## Phase 6: Mobile Application Updates

### 6.1 Settings Screen Enhancement

**File: `apps/mobile/app/(tabs)/settings.tsx`**

Add workspace configuration section:

- Workspace list with directory paths
- Add new workspace (directory picker)
- Edit/Delete workspace
- Set default provider per workspace

### 6.2 Storage Updates

**File: `apps/mobile/hooks/useAuth.ts`**

Add workspace storage:

```typescript
// New secure storage keys
const WORKSPACES_KEY = 'happy-workspaces'
const ACTIVE_WORKSPACE_KEY = 'happy-active-workspace'

// Add to hook:
const [workspaces, setWorkspaces] = useState<Workspace[]>([])
const [activeWorkspace, setActiveWorkspace] = useState<string | null>(null)

// Async storage for workspaces (since they can be longer)
const saveWorkspaces = async (workspaces: Workspace[]) => { ... }
const loadWorkspaces = async () => { ... }
```

### 6.3 Chat Screen Updates

**File: `apps/mobile/app/(tabs)/index.tsx`**

- Add workspace indicator in header
- Quick workspace switcher
- Pass workspace context to bridge connection

---

## Phase 7: Bridge Protocol Enhancements

### 7.1 Extend WebSocket Messages

**File: `packages/shared/src/schema/message.ts`**

Add new message types:

```typescript
export const wsMessageSchema = z.discriminatedUnion('type', [
	// Existing types...
	z.object({
		type: z.literal('workspace'),
		workspaceId: z.string().optional(),
		workspacePath: z.string().optional(),
	}),
	z.object({
		type: ziteral('model'),
		model: z.string(),
	}),
])
```

### 7.2 CLI Bridge Updates

**File: `packages/cli/src/commands/connect.ts`**

- Send workspace info on connect
- Handle workspace-specific prompts
- Support model selection in connection

---

## Phase 8: Error Handling & Validation

### 8.1 CLI Error Improvements

Add clear error messages with suggestions:

- Agent not found → "Install {provider} CLI: npm install -g {package}"
- Connection failed → "Check server URL and authentication token"
- Workspace not found → "Create workspace: happy-vibecode workspace add"
- Invalid workspace → "Directory does not exist or is not accessible"

### 8.2 WebSocket Error Handling

- Implement reconnection with exponential backoff
- Add connection status indicators
- Show helpful error messages in UI

---

## Phase 9: Documentation

### 9.1 CLI Help Updates

- Update all command descriptions
- Add examples for each new option
- Document workspace management commands

### 9.2 README Updates

**File: `packages/cli/README.md` (if exists)**

- Document all LLM providers
- Explain workspace configuration
- Add troubleshooting section

---

## Implementation Order

| Phase | Task                      | Files to Modify                                                              |
| ----- | ------------------------- | ---------------------------------------------------------------------------- |
| 1     | CLI package.json updates  | `packages/cli/package.json`                                                  |
| 2     | Create LLM provider types | New: `packages/cli/src/types/llm-provider.ts`                                |
| 3     | Update init command       | `packages/cli/src/commands/init.ts`                                          |
| 4     | Enhance connect command   | `packages/cli/src/commands/connect.ts`                                       |
| 5     | Create workspace config   | New: `packages/cli/src/config/workspace.ts`                                  |
| 6     | Add shared schemas        | New: `packages/shared/src/schema/llm-provider.ts`, update `agent-session.ts` |
| 7     | Update database schema    | `packages/db/src/schema.ts`                                                  |
| 8     | Add API routes            | New: `packages/api/src/routes/workspace.ts`, mount in worker                 |
| 9     | Update web settings       | `apps/web/app/settings/page.tsx`, new components                             |
| 10    | Update web hooks          | `apps/web/app/hooks/useAuth.ts`                                              |
| 11    | Update mobile settings    | `apps/mobile/app/(tabs)/settings.tsx`                                        |
| 12    | Update mobile hooks       | `apps/mobile/hooks/useAuth.ts`                                               |
| 13    | Test and validate         | Run typecheck, lint                                                          |

---

## Testing Checklist

- [ ] CLI connects with all 5 providers (gemini, claude, codex, opencode-ai, copilot)
- [ ] `-p/--prompt` option works for non-interactive prompts
- [ ] `-d/--dir` workspace option works
- [ ] `-m/--model` selection works
- [ ] Workspaces persist across sessions
- [ ] Web app shows workspace selector
- [ ] Mobile app shows workspace selector
- [ ] Error messages are helpful and actionable
- [ ] Cross-platform (Windows, macOS, Linux) compatibility
