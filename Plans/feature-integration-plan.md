# Feature Integration Plan — Happy Vibecode

## Context

Solo engineer, 3-4 day sprint, free-tier AI agents. Plan focuses on **highest-impact, most feasible** work, defers low-priority items, and breaks the GitHub Integration into a realistic first sprint scope.

---

## Sprint Scope (3-4 Days)

### What's In

| Feature                     | Scope                                                 | Day | Complexity |
| --------------------------- | ----------------------------------------------------- | --- | ---------- |
| GitHub Integration Phase 1  | Auth upgrade, DB schema, service layer, repo CRUD API | 1-2 | High       |
| Rate Limiting Foundation    | Middleware, per-tier limits, quota enforcement        | 3   | Medium     |
| Error Handling Improvements | Web auto-reconnect, API timeout handling              | 3-4 | Low        |
| LLM Provider Config UI      | Provider selection in settings, capability metadata   | 4   | Low-Medium |

### What's Deferred

| Feature                    | Reason                                          |
| -------------------------- | ----------------------------------------------- |
| #2 Real-Time Collaboration | Architectural overhaul, not aligned with sprint |
| #8 Plugin System           | Complex, no existing foundation                 |
| #9 Multi-Language          | Requires full UI refactor                       |
| #13 Multi-Repo Workspaces  | Depends on GitHub Integration (Phase 2+)        |
| #14 Diff-Aware Suggestions | Depends on GitHub PR Review (Phase 4)           |
| #15 CI/CD Integration      | Depends on GitHub + Webhooks (Phase 3+)         |
| #16 Local-First Offline    | Needs scoping (deferred per user decision)      |
| #17 Skill Marketplace      | Needs scoping (deferred per user decision)      |
| #11 Session Playback       | Low priority, persistence already works         |
| #3 Webhooks Generalization | Stripe pattern exists; generalize post-sprint   |

### Already Complete (No Work Needed)

| Feature                   | Status                                              |
| ------------------------- | --------------------------------------------------- |
| #5 Analytics Dashboard    | ✅ Implemented                                      |
| #7 Custom Agent Templates | ✅ Implemented                                      |
| #4 Push Notifications     | ✅ Core infra done                                  |
| #4 Biometric Auth         | ✅ Hooks exist (`useBiometric.ts`, `useAppLock.ts`) |
| #4 Offline Sync           | ✅ Queue table + routes exist                       |

---

## Day 1-2: GitHub Integration Phase 1 — Auth & Repo Linking

This is the sprint's core deliverable. It builds the foundation for all GitHub-dependent features (#13, #14, #15).

### Step 1.1: Database Schema (1-2 hours)

**File**: `packages/db/src/schema.ts`

Add three new tables from the existing plan (`Plans/github-repository-integration.md`, Section 3.1a):

```typescript
// linked_repos — user-linked GitHub repositories
export const linkedRepos = sqliteTable('linked_repos', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id),
	githubRepoId: integer('github_repo_id').notNull(),
	owner: text('owner').notNull(),
	name: text('name').notNull(),
	fullName: text('full_name').notNull(),
	defaultBranch: text('default_branch').notNull().default('main'),
	private: integer('private', {mode: 'boolean'}).notNull().default(false),
	lastSyncedAt: integer('last_synced_at', {mode: 'timestamp_ms'}),
	syncStatus: text('sync_status', {
		enum: ['pending', 'syncing', 'synced', 'error'],
	})
		.notNull()
		.default('pending'),
	syncError: text('sync_error'),
	webhookId: integer('webhook_id'),
	createdAt: integer('created_at', {mode: 'timestamp_ms'}).notNull(),
	updatedAt: integer('updated_at', {mode: 'timestamp_ms'}).notNull(),
})

// repo_files — indexed file metadata
export const repoFiles = sqliteTable('repo_files', {
	id: text('id').primaryKey(),
	repoId: text('repo_id')
		.notNull()
		.references(() => linkedRepos.id, {onDelete: 'cascade'}),
	path: text('path').notNull(),
	sha: text('sha').notNull(),
	size: integer('size').notNull(),
	language: text('language'),
	summary: text('summary'),
	lastIndexedAt: integer('last_indexed_at', {mode: 'timestamp_ms'}).notNull(),
})

// repo_embeddings — code embeddings (Phase 5, schema only for now)
export const repoEmbeddings = sqliteTable('repo_embeddings', {
	id: text('id').primaryKey(),
	repoId: text('repo_id')
		.notNull()
		.references(() => linkedRepos.id, {onDelete: 'cascade'}),
	filePath: text('file_path').notNull(),
	chunkIndex: integer('chunk_index').notNull(),
	content: text('content').notNull(),
	embedding: text('embedding').notNull(), // JSON array
	createdAt: integer('created_at', {mode: 'timestamp_ms'}).notNull(),
})
```

Then generate migration:

```bash
bun run -F @happy-vibecode/db generate
```

**Risks**: Migration 0005 has known column mismatch issues per existing plans. Fix before generating new migration.

### Step 1.2: Zod Schemas (30 min)

**New file**: `packages/shared/src/schema/github-repo.ts`

```typescript
import {z} from 'zod'

export const linkedRepoSchema = z.object({
	id: z.string().uuid(),
	userId: z.string(),
	githubRepoId: z.number(),
	owner: z.string(),
	name: z.string(),
	fullName: z.string(),
	defaultBranch: z.string(),
	private: z.boolean(),
	lastSyncedAt: z.date().nullable(),
	syncStatus: z.enum(['pending', 'syncing', 'synced', 'error']),
	syncError: z.string().nullable(),
	webhookId: z.number().nullable(),
	createdAt: z.date(),
	updatedAt: z.date(),
})

export const createLinkedRepoSchema = z.object({
	owner: z.string().min(1),
	name: z.string().min(1),
})

export const repoFileSchema = z.object({
	id: z.string().uuid(),
	repoId: z.string(),
	path: z.string(),
	sha: z.string(),
	size: z.number(),
	language: z.string().nullable(),
	summary: z.string().nullable(),
	lastIndexedAt: z.date(),
})

export type LinkedRepo = z.infer<typeof linkedRepoSchema>
export type CreateLinkedRepo = z.infer<typeof createLinkedRepoSchema>
export type RepoFile = z.infer<typeof repoFileSchema>
```

**Modify**: `packages/shared/src/index.ts` — add export.

### Step 1.3: GitHub Service Layer (2-3 hours)

**New file**: `packages/api/src/services/github.ts`

Core functions:

```typescript
// getGitHubClient(userId) → Octokit instance using OAuth token from auth_account
// getUserRepos(userId) → paginated repo list
// getRepoTree(userId, owner, repo, ref) → recursive tree, cache in KV
// getFileContent(userId, owner, repo, path) → file content, cache in KV
// refreshAccessToken(userId) → OAuth token refresh
```

**Dependencies**: `octokit` (add to `packages/api/package.json`)

**Key considerations**:

- Retrieve OAuth token from `auth_account` table (where `providerId = 'github'`)
- Use existing `DB` binding for D1 access in service functions
- Use existing `KV` binding for caching (tree: 1hr TTL, file content: 6hr TTL)
- Handle GitHub rate limits with exponential backoff + `X-RateLimit-Reset` header
- Fallback: if user lacks `repo` scope, return clear error prompting re-auth

### Step 1.4: OAuth Scope Upgrade (1-2 hours)

**Modify**: `apps/web/worker/auth.ts`

Add a secondary GitHub OAuth provider configuration with expanded scopes:

```typescript
// Option A: Add repo scope to existing provider (simplest, may break existing sessions)
// Option B: Create separate 'github-repo' provider for incremental auth

// Recommended: Option B — keep existing auth minimal, add scope upgrade endpoint
```

**New endpoint**: `POST /api/repos/auth/upgrade` — redirects to GitHub OAuth with `repo` scope, stores upgraded token in `auth_account` with a flag.

**Fallback**: Allow users to provide a GitHub PAT via Settings → stored encrypted in `auth_account` with `providerId: 'github-pat'`.

### Step 1.5: API Routes (2-3 hours)

**New file**: `packages/api/src/routes/repos.ts`

```
GET    /api/repos              — List user's linked repos
POST   /api/repos              — Link a new repo
DELETE /api/repos/:id          — Unlink repo
GET    /api/repos/:id          — Repo details + sync status
POST   /api/repos/:id/sync     — Trigger manual re-sync
GET    /api/repos/:id/tree     — Cached file tree
GET    /api/repos/:id/files    — File content (lazy from GitHub API)
GET    /api/repos/:id/search   — Code search within repo
POST   /api/repos/auth/upgrade — OAuth scope upgrade flow
```

**Mount in**: `packages/api/src/index.ts` — add `reposRouter`.

### Step 1.6: Repo Indexing (1-2 hours)

**New file**: `packages/api/src/services/repo-indexer.ts`

```typescript
// indexRepo(repoId) — full tree fetch → D1 file metadata → KV tree cache
// syncRepo(repoId) — incremental: compare SHAs, update changed files
```

Sync trigger: manual via `/api/repos/:id/sync` endpoint. Periodic sync (Durable Object alarm) deferred to Phase 2.

### Day 1-2 Deliverables Checklist

- [ ] Database migration for `linked_repos`, `repo_files`, `repo_embeddings`
- [ ] Zod schemas in shared package
- [ ] GitHub service layer with Octokit
- [ ] API routes for repo CRUD
- [ ] OAuth scope upgrade flow (or PAT fallback)
- [ ] Basic repo indexing (tree fetch + KV cache)
- [ ] Typecheck passes: `bun run typecheck`
- [ ] Lint passes: `bun run lint:fix`

---

## Day 3: Rate Limiting Foundation

### Step 3.1: Rate Limit Middleware (2-3 hours)

**New file**: `packages/api/src/middleware/rate-limit.ts`

```typescript
// Rate limit strategy: KV-backed sliding window counter
// Key format: ratelimit:{userId}:{endpoint}:{window}
// Store in KV with TTL = window size

interface RateLimitConfig {
	windowMs: number // Time window (e.g., 60000 for 1 minute)
	maxRequests: number // Max requests per window
	keyGenerator?: (c: Context) => string // Custom key extraction
}

// Default limits per tier:
// free: 30 req/min, 500 req/day, 3 concurrent sessions
// pro: 120 req/min, 5000 req/day, 10 concurrent sessions
```

Apply to `packages/api/src/index.ts` as global middleware with tier-based config lookup.

### Step 3.2: Quota Enforcement (1-2 hours)

**Modify**: `packages/api/src/middleware/auth.ts`

After authenticating, check:

1. Daily request count (KV counter: `quota:{userId}:{date}`)
2. Active session count (D1 query: `agentSessions` where status = active)
3. Token usage (if tracking implemented)

Reject with `429 Too Many Requests` + `Retry-After` header when exceeded.

### Step 3.3: Admin Rate Limit Config (1 hour)

**Modify**: `packages/api/src/routes/admin-analytics.ts` or new `admin-config.ts`

Allow admins to view/override rate limits per user.

### Day 3 Deliverables

- [ ] Rate limit middleware with KV-backed counters
- [ ] Per-tier default limits (free/pro)
- [ ] Quota enforcement in auth middleware
- [ ] 429 responses with proper headers
- [ ] Typecheck + lint pass

---

## Day 3-4: Error Handling Improvements

### Step 4.1: Web Chat Auto-Reconnect (1-2 hours)

**Modify**: `apps/web/app/chat/Chat.tsx`

The chat component already has WebSocket connection logic. Add:

- Exponential backoff reconnection (matching CLI pattern in `packages/cli/src/commands/connect.ts`)
- Connection status indicator (connected/reconnecting/disconnected)
- Queue prompts during disconnection, flush on reconnect

### Step 4.2: API Timeout + Retry (1 hour)

**New utility**: `packages/api/src/lib/fetch-with-retry.ts`

```typescript
// fetchWithRetry(url, options, { maxRetries: 3, timeoutMs: 10000 })
// Used by GitHub service and any external API calls
```

### Day 4 Deliverables

- [ ] WebSocket auto-reconnect in chat UI
- [ ] Connection status indicator
- [ ] API fetch retry utility
- [ ] Typecheck + lint pass

---

## Day 4 (If Time Permits): LLM Provider Config UI

### Step 5.1: Settings Page Provider Section (1-2 hours)

**Modify**: `apps/web/app/settings/page.tsx`

The `llmProviderSchema` and workspace schema already exist. Add UI:

- Provider dropdown (gemini, claude, codex, opencode-ai, copilot, kilo, custom)
- Model selection per provider
- Save to workspace `defaultProvider`/`defaultModel` fields

### Step 5.2: Provider Capability Metadata (30 min)

**New file**: `packages/shared/src/schema/provider-capabilities.ts`

```typescript
export const providerCapabilities = {
	gemini: {maxTokens: 1000000, models: ['gemini-2.0-flash', 'gemini-2.0-pro']},
	claude: {
		maxTokens: 200000,
		models: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514'],
	},
	codex: {maxTokens: 128000, models: ['o4-mini', 'codex-mini']},
	// ...
}
```

### Day 4 Deliverables

- [ ] Provider selection UI in settings
- [ ] Provider capability metadata
- [ ] Workspace provider/model persistence
- [ ] Typecheck + lint pass

---

## Dependency Graph

```
GitHub Integration (Day 1-2)
├── No upstream dependencies
├── Downstream: Multi-Repo (#13), Diff-Aware (#14), CI/CD (#15)
└── Blocks: All GitHub-dependent features

Rate Limiting (Day 3)
├── No upstream dependencies (standalone)
├── Downstream: Subscription enforcement
└── Blocks: Scaling to production

Error Handling (Day 3-4)
├── No upstream dependencies (standalone)
├── Downstream: Reliability for all features
└── Blocks: Nothing critical

LLM Provider Config UI (Day 4)
├── No upstream dependencies (schemas exist)
├── Downstream: Per-session model switching
└── Blocks: Nothing critical
```

---

## Technical Components Required

### New Packages

| Package   | Purpose                    | Install Command                          |
| --------- | -------------------------- | ---------------------------------------- |
| `octokit` | GitHub REST/GraphQL client | `bun add octokit -F @happy-vibecode/api` |

### Cloudflare Bindings

| Binding            | Already Exists | Used By                                   |
| ------------------ | -------------- | ----------------------------------------- |
| `DB` (D1)          | ✅             | linked_repos, repo_files tables           |
| `KV`               | ✅             | Rate limit counters, repo tree/file cache |
| `BridgeAgent` (DO) | ✅             | Existing, no changes needed for Phase 1   |

### Wrangler Secrets (New)

| Secret           | Purpose                                               |
| ---------------- | ----------------------------------------------------- |
| None for Phase 1 | Uses existing `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` |

---

## Risk Register

| Risk                                                       | Impact | Likelihood | Mitigation                                                                             |
| ---------------------------------------------------------- | ------ | ---------- | -------------------------------------------------------------------------------------- |
| Migration 0005 column mismatch breaks new migrations       | High   | Medium     | Fix migration 0005 first, test chain locally before generating                         |
| GitHub API rate limits during indexing                     | Medium | High       | Aggressive KV caching, lazy file loading, respect rate limit headers                   |
| OAuth scope upgrade breaks existing sessions               | Medium | Low        | Use incremental auth (separate provider/flag), don't modify existing tokens            |
| Free agent context limits cause incomplete implementations | High   | High       | Break tasks into small atomic steps, verify each step with typecheck before proceeding |
| octokit bundle size exceeds Workers limits                 | Medium | Low        | Use `octokit` (tree-shakeable), not `@octokit/rest`; test bundle size after install    |

---

## Verification Steps (After Each Major Step)

```bash
# 1. Type checking
bun run typecheck

# 2. Lint and fix
bun run lint:fix

# 3. Build verification
bun run build

# 4. Database migration test (local)
bun run -F @happy-vibecode/db generate
bun run -F @happy-vibecode/db migrate

# 5. API health check
curl http://localhost:8787/api/health
```

---

## Post-Sprint Roadmap (Future Sprints)

### Sprint 2 (Next 3-4 days)

- GitHub Phase 2: Repo indexing improvements, file tree UI component
- GitHub Phase 3: Context injection into BridgeAgent prompts
- Webhook generalization framework
- Session playback UI

### Sprint 3 (Next 3-4 days)

- GitHub Phase 4: PR review automation
- Multi-Repo Workspace Composition (#13)
- Diff-Aware Suggestions (#14)
- CI/CD Integration foundation (#15)

### Sprint 4+

- Local-First Offline Mode (#16) — after scoping
- Skill Marketplace (#17) — after scoping
- Real-Time Collaboration (#2) — architectural planning needed
- i18n (#9) — if needed
- Plugin System (#8) — if demand exists

---

## Decision Log

| Decision                                          | Rationale                                                                  |
| ------------------------------------------------- | -------------------------------------------------------------------------- |
| Focus GitHub Phase 1 only (auth + linking)        | Full 5-phase plan is 8 weeks; Phase 1 alone provides core value in 2 days  |
| Use Octokit (not raw fetch)                       | Official SDK, TypeScript support, built-in pagination, rate limit handling |
| Defer Multi-Repo, Diff-Aware, CI/CD               | All depend on GitHub Integration being complete                            |
| Defer #16, #17 per user request                   | Need scoping before inclusion                                              |
| KV for rate limiting (not D1)                     | Faster reads, atomic counters, TTL support                                 |
| Incremental OAuth (not scope upgrade on existing) | Won't break existing GitHub auth sessions                                  |
| Use PAT fallback for GitHub auth                  | Simpler than OAuth scope upgrade flow for first iteration                  |

---

_Plan created: March 2026_
_Scope: 3-4 day solo sprint_
_Primary deliverable: GitHub Integration Phase 1 + Rate Limiting + Error Handling_
