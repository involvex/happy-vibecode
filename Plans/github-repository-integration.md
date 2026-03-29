# GitHub Repository Integration — Implementation Plan

## Overview

This plan details the implementation of GitHub Repository Integration for Happy Vibecode, enabling users to link GitHub repositories to their workspace and provide contextual code awareness to AI agents.

---

## 1. Architecture Design

### 1.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                            │
│  Settings Page → "Connect GitHub Repo" → OAuth scope upgrade     │
│  Chat UI → "Attach Repo Context" button → file/diff selector     │
└───────────────────────┬──────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────────┐
│                     API LAYER (Hono)                             │
│  /api/repos/* — CRUD for linked repositories                     │
│  /api/repos/:id/files — tree listing, file content retrieval     │
│  /api/repos/:id/search — code search within repo                 │
│  /api/repos/:id/prs — PR listing, diff retrieval, review        │
│  /api/webhooks/github — GitHub webhook receiver                  │
└───────────────────────┬──────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────────┐
│                   GITHUB SERVICE LAYER                           │
│  github-api.ts — GitHub REST/GraphQL client (Octokit)            │
│  repo-indexer.ts — Fetches + caches repo tree + file content     │
│  code-search.ts — Search across indexed repo content             │
│  pr-review.ts — PR diff fetching + review comment posting        │
└───────────────────────┬──────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────────┐
│                    STORAGE LAYER                                 │
│  D1: linked_repos, repo_files, repo_index tables                 │
│  KV: repo tree cache, file content cache (TTL-based)             │
│  auth_account.access_token: GitHub OAuth token (existing)        │
└──────────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────────┐
│                  CONTEXT INJECTION PIPELINE                      │
│  BridgeAgent → enrichPrompt() → inject relevant repo context     │
│  Context strategies: file-level, diff-aware, tree-sitter parsed  │
└──────────────────────────────────────────────────────────────────┘
```

### 1.2 Authentication Strategy

The existing GitHub OAuth via Better Auth already stores `access_token` and `refresh_token` in the `auth_account` table. The plan leverages this with a scope upgrade:

- **Current scope**: Default Better Auth scope (user identity only)
- **Required scopes**: `repo` (private repos), `public_repo` (public only), `read:org` (org repos)
- **Approach**: Add a "Connect Repository" flow that triggers a new OAuth consent with expanded scopes via Better Auth's social provider configuration
- **Fallback**: Users who prefer PAT can provide a GitHub Personal Access Token via Settings → stored encrypted in `auth_account` table with `providerId: 'github-pat'`

### 1.3 Repository Linking Flow

1. User navigates to Settings → Repositories
2. Clicks "Link Repository"
3. If GitHub OAuth token lacks `repo` scope → redirect to GitHub OAuth with expanded scopes
4. GitHub returns with upgraded token → stored in `auth_account`
5. API fetches user's repositories via GitHub API → displays picker
6. User selects repo → `linked_repos` record created
7. Background: repo tree fetched, indexed, cached in KV

### 1.4 Code Syncing Strategy

- **On link**: Full tree fetch + file content cache for top-level structure
- **On demand**: File content fetched when agent requests context (lazy loading)
- **Webhook-driven**: GitHub webhook pushes trigger cache invalidation + re-index
- **Manual refresh**: User can trigger re-sync from UI
- **Polling fallback**: For users without webhooks, periodic sync every 6 hours via Durable Object alarm

---

## 2. Technical Stack

### 2.1 Libraries

| Library                                              | Purpose                             | Justification                                                |
| ---------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------ |
| `octokit`                                            | GitHub REST/GraphQL client          | Official GitHub SDK, TypeScript support, built-in pagination |
| `@octokit/webhooks`                                  | Webhook signature verification      | Official, handles event typing                               |
| `tree-sitter` (WASM)                                 | Code parsing for context extraction | Runs in Workers via WASM, enables AST-level context          |
| `tree-sitter-javascript`, `tree-sitter-python`, etc. | Language grammars                   | WASM-compatible language parsers                             |

### 2.2 GitHub API Usage

| Operation           | API     | Endpoint                                                  |
| ------------------- | ------- | --------------------------------------------------------- |
| List repos          | REST    | `GET /user/repos`                                         |
| Get repo tree       | REST    | `GET /repos/{owner}/{repo}/git/trees/{sha}?recursive=1`   |
| Get file content    | REST    | `GET /repos/{owner}/{repo}/contents/{path}`               |
| Search code         | REST    | `GET /search/code?q={query}+repo:{owner}/{repo}`          |
| List PRs            | REST    | `GET /repos/{owner}/{repo}/pulls`                         |
| Get PR diff         | REST    | `GET /repos/{owner}/{repo}/pulls/{number}` (Accept: diff) |
| Post review comment | REST    | `POST /repos/{owner}/{repo}/pulls/{number}/comments`      |
| Get PR files        | REST    | `GET /repos/{owner}/{repo}/pulls/{number}/files`          |
| GraphQL (batch)     | GraphQL | `POST /graphql` for efficient multi-file fetches          |

### 2.3 Storage Strategy

| Data                  | Store                                    | TTL/Size  | Rationale                  |
| --------------------- | ---------------------------------------- | --------- | -------------------------- |
| Linked repos metadata | D1 `linked_repos`                        | Permanent | Core relationship data     |
| Repo file tree        | KV `repo:tree:{id}`                      | 1 hour    | Frequently accessed, large |
| File content          | KV `repo:file:{id}:{path}`               | 6 hours   | Lazy-loaded, size-limited  |
| File summaries        | D1 `repo_files`                          | Permanent | Small, queryable           |
| Code embeddings       | D1 `repo_embeddings` (future: Vectorize) | Permanent | Semantic search            |
| Webhook events        | KV `repo:webhook:{delivery}`             | 24 hours  | Deduplication              |

### 2.4 Cloudflare Bindings Required

Add to `wrangler.jsonc`:

- `VECTORIZE` — Vectorize index for code embeddings (Phase 4+)
- Existing `KV` — Already bound, will be used for caching
- Existing `DB` — D1 for persistent storage

---

## 3. Implementation Phases

### Phase 1: Foundation — Auth & Repo Linking (Week 1-2)

**Goal**: Users can connect their GitHub account with repo scope and link repositories.

#### 1a. Database Schema

Add tables to `packages/db/src/schema.ts`:

```typescript
export const linkedRepos = sqliteTable('linked_repos', {
	id: text('id').primaryKey(), // UUID
	userId: text('user_id')
		.notNull()
		.references(() => users.id),
	githubRepoId: integer('github_repo_id').notNull(), // GitHub's repo ID
	owner: text('owner').notNull(), // GitHub owner/org
	name: text('name').notNull(), // Repo name
	fullName: text('full_name').notNull(), // owner/name
	defaultBranch: text('default_branch').notNull().default('main'),
	private: integer('private', {mode: 'boolean'}).notNull().default(false),
	cloneUrl: text('clone_url'), // For reference only
	lastSyncedAt: integer('last_synced_at', {mode: 'timestamp_ms'}),
	syncStatus: text('sync_status', {
		enum: ['pending', 'syncing', 'synced', 'error'],
	})
		.notNull()
		.default('pending'),
	syncError: text('sync_error'),
	webhookId: integer('webhook_id'), // GitHub webhook ID if registered
	createdAt: integer('created_at', {mode: 'timestamp_ms'}).notNull(),
	updatedAt: integer('updated_at', {mode: 'timestamp_ms'}).notNull(),
})

export const repoFiles = sqliteTable('repo_files', {
	id: text('id').primaryKey(), // UUID
	repoId: text('repo_id')
		.notNull()
		.references(() => linkedRepos.id, {onDelete: 'cascade'}),
	path: text('path').notNull(), // File path in repo
	sha: text('sha').notNull(), // Git blob SHA
	size: integer('size').notNull(),
	language: text('language'), // Detected language
	summary: text('summary'), // AI-generated file summary
	lastIndexedAt: integer('last_indexed_at', {mode: 'timestamp_ms'}).notNull(),
})

export const repoEmbeddings = sqliteTable('repo_embeddings', {
	id: text('id').primaryKey(),
	repoId: text('repo_id')
		.notNull()
		.references(() => linkedRepos.id, {onDelete: 'cascade'}),
	filePath: text('file_path').notNull(),
	chunkIndex: integer('chunk_index').notNull(),
	content: text('content').notNull(), // The text chunk
	embedding: text('embedding').notNull(), // JSON array of floats (or Vectorize ID)
	createdAt: integer('created_at', {mode: 'timestamp_ms'}).notNull(),
})
```

#### 1b. GitHub OAuth Scope Upgrade

Modify `apps/web/worker/auth.ts` to support incremental OAuth scopes:

- Add `repo` scope to GitHub social provider when user opts into repository linking
- Use Better Auth's `scope` parameter in the social provider configuration
- Store the scope upgrade in the existing `auth_account.scope` field

#### 1c. Zod Schemas

Add to `packages/shared/src/schema/github-repo.ts`:

- `linkedRepoSchema`, `createLinkedRepoSchema`, `repoFileSchema`
- `repoTreeSchema` (nested file tree structure)
- Export from `packages/shared/src/index.ts`

#### 1d. API Routes

Create `packages/api/src/routes/repos.ts`:

- `GET /api/repos` — List user's linked repos
- `POST /api/repos` — Link a new repo (accepts `owner/repo` or GitHub repo ID)
- `DELETE /api/repos/:id` — Unlink repo
- `GET /api/repos/:id` — Get repo details + sync status
- `POST /api/repos/:id/sync` — Trigger manual re-sync
- `GET /api/repos/:id/tree` — Get cached file tree
- `GET /api/repos/:id/files?path=` — Get file content (lazy from GitHub API)
- `GET /api/repos/:id/search?q=` — Search code within repo

Mount in `apps/web/worker/index.ts` or via `packages/api/src/index.ts`.

#### 1e. GitHub Service

Create `packages/api/src/services/github.ts`:

- `getGitHubClient(userId)` — Retrieves OAuth token from `auth_account`, creates Octokit instance
- `getUserRepos(userId)` — Lists accessible repositories with pagination
- `getRepoTree(userId, owner, repo, ref)` — Fetches recursive tree, caches in KV
- `getFileContent(userId, owner, repo, path)` — Fetches file, caches in KV
- `refreshAccessToken(userId)` — Handles OAuth token refresh if expired

#### Deliverables:

- [ ] Database migration for `linked_repos`, `repo_files`, `repo_embeddings`
- [ ] Zod schemas in shared package
- [ ] GitHub service layer with Octokit
- [ ] API routes for repo CRUD
- [ ] Settings UI for linking/unlinking repos
- [ ] OAuth scope upgrade flow

---

### Phase 2: Repo Indexing & Caching (Week 3)

**Goal**: Linked repositories are indexed with file trees and content cached for fast retrieval.

#### 2a. Repo Indexer Service

Create `packages/api/src/services/repo-indexer.ts`:

- `indexRepo(repoId)` — Full index: fetch tree → store file metadata in D1 → cache tree in KV
- `syncRepo(repoId)` — Incremental sync: compare tree SHAs, update changed files
- `handleWebhookEvent(event)` — Process push events to invalidate/re-index

#### 2b. Background Sync via Durable Object Alarm

Extend or create a Durable Object for periodic sync:

- Alarm fires every 6 hours per linked repo
- Calls `syncRepo()` to check for updates
- Updates `syncStatus` and `lastSyncedAt`

#### 2c. File Tree UI Component

Create `apps/web/app/components/RepoFileTree.tsx`:

- Collapsible tree view of repository files
- File type icons based on extension
- Click to preview file content
- Multi-select for choosing context files

#### Deliverables:

- [ ] Repo indexer with full + incremental sync
- [ ] KV caching layer for tree + file content
- [ ] Durable Object alarm for periodic sync
- [ ] File tree UI component
- [ ] Sync status indicators in UI

---

### Phase 3: Context Injection into Agent (Week 4-5)

**Goal**: Agent prompts are enriched with relevant repository context.

#### 3a. Context Injection in BridgeAgent

Modify `apps/web/worker/bridge-agent.ts`:

- Before relaying `prompt` to CLI, call `enrichPrompt(content, contextConfig)`
- `contextConfig` specifies: repo IDs, file paths, inclusion mode

```typescript
interface RepoContextConfig {
	repoIds: string[]
	filePaths?: string[] // Explicit file selection
	maxTokens?: number // Token budget (default: 4000)
	mode: 'files' | 'diff' | 'summary' | 'semantic'
}
```

#### 3b. Context Strategies

Implement multiple context injection strategies:

1. **File-level**: Include full content of selected files
2. **Diff-aware**: Include only changed files/diffs for PR review
3. **Summary**: Include AI-generated file summaries (smaller footprint)
4. **Semantic** (Phase 4): Embedding-based retrieval for relevant snippets

#### 3c. Token Budget Management

Create `packages/api/src/services/context-builder.ts`:

- `buildContext(config, tokenBudget)` — Assembles context within token limits
- Priority: user-selected files > related files > summaries
- Truncation strategy: head+tail for code files, full for configs
- Token counting via `tiktoken` or approximate byte-based estimation

#### 3d. Chat UI Context Picker

Create `apps/web/app/components/RepoContextPicker.tsx`:

- Toggle panel in chat UI: "Attach Repository Context"
- Select linked repo → browse files → select files to include
- Shows estimated token count
- "Smart select" button: auto-selects files related to the user's prompt

#### Deliverables:

- [ ] Context enrichment in BridgeAgent message flow
- [ ] Context builder with token budget management
- [ ] File-level and diff-aware context strategies
- [ ] Context picker UI in chat interface
- [ ] WebSocket message type for context configuration

---

### Phase 4: PR Review Automation (Week 6-7)

**Goal**: Automated PR reviews with diff-aware code suggestions.

#### 4a. PR Routes

Add to `packages/api/src/routes/repos.ts`:

- `GET /api/repos/:id/prs` — List open PRs
- `GET /api/repos/:id/prs/:number` — Get PR details + diff
- `GET /api/repos/:id/prs/:number/files` — Get changed files
- `POST /api/repos/:id/prs/:number/review` — Trigger AI review
- `POST /api/repos/:id/prs/:number/comments` — Post review comments

#### 4b. PR Review Engine

Create `packages/api/src/services/pr-review.ts`:

- Fetch PR diff via GitHub API
- Parse diff into hunks with context lines
- Build review prompt with: diff hunks + related file context + repo structure
- Stream review via existing agent bridge
- Post inline comments back to GitHub PR

#### 4c. Review UI

Add PR review panel to chat or create dedicated `/repos/:id/prs/:number` page:

- Diff viewer with syntax highlighting
- AI review comments mapped to diff lines
- "Approve", "Request Changes", "Comment" actions
- One-click "Apply suggestion" that generates a commit

#### Deliverables:

- [ ] PR listing and diff retrieval API
- [ ] PR review engine with diff parsing
- [ ] GitHub review comment posting
- [ ] PR review UI with diff viewer
- [ ] Integration with existing chat system for review discussions

---

### Phase 5: Code-Aware Debugging Assistance (Week 8)

**Goal**: Agent provides debugging help with awareness of the user's codebase.

#### 5a. Enhanced Semantic Search

- Generate embeddings for code chunks (files split by function/class)
- Store in D1 (Phase 1-3) or Vectorize (production)
- Query: embed user's error message or question → retrieve relevant code chunks

#### 5b. Error-to-Code Mapping

- Parse error stack traces to identify file paths and line numbers
- Fetch relevant code context around error location
- Include in agent prompt automatically when error patterns detected

#### 5c. GitHub Issues Integration

- Link GitHub issues to agent sessions
- Fetch issue description + comments as context
- Post agent responses as issue comments (optional)

#### Deliverables:

- [ ] Embedding generation pipeline
- [ ] Semantic code search API
- [ ] Error-to-code context mapping
- [ ] GitHub issues integration
- [ ] Automatic context detection from error messages

---

## 4. Agent Context Strategy

### 4.1 Context Window Management

| Strategy              | Token Cost                | Use Case                                               |
| --------------------- | ------------------------- | ------------------------------------------------------ |
| File tree             | ~200 tokens               | Always included — gives agent repo structure awareness |
| Selected file (full)  | ~1-4K tokens per file     | User explicitly selects files for context              |
| File summary          | ~100-200 tokens per file  | Overview of file purpose without full content          |
| Code chunk (semantic) | ~300-500 tokens per chunk | RAG-style relevant snippet retrieval                   |
| Diff hunk             | ~200-1K tokens per hunk   | PR review context                                      |
| Error context         | ~500-1K tokens            | Automatic stack trace → code mapping                   |

### 4.2 Token Budget Allocation

Default budget: 4,000 tokens for repo context (configurable per user/plan tier).

```
Total context budget: 4000 tokens
├── File tree summary: 200 tokens (always)
├── User-selected files: up to 2000 tokens
├── Related file summaries: up to 1000 tokens
└── Semantic search results: up to 800 tokens
```

### 4.3 Indexing Strategy

**Level 1 — Tree Index (Phase 2)**:

- Full recursive tree from GitHub API
- Stored in KV with 1-hour TTL
- File metadata (path, size, language) in D1

**Level 2 — Content Cache (Phase 2-3)**:

- File content fetched on demand, cached in KV (6-hour TTL)
- Size limit: 100KB per file (larger files truncated to head+tail)

**Level 3 — Summaries (Phase 3)**:

- AI-generated summaries for each file (1-2 sentences)
- Generated on first access, stored in D1 `repo_files.summary`
- Regenerated on file SHA change

**Level 4 — Embeddings (Phase 5)**:

- Code split into chunks (by function/class boundaries using tree-sitter)
- Each chunk embedded via Workers AI (`@cf/google/embeddinggemma-300m` or `@cf/qwen/qwen3-embedding-0.6b`)
- Stored in Vectorize or D1 as JSON array
- Cosine similarity search for relevant retrieval

### 4.4 Context Injection Format

```typescript
// Injected as system message before user's prompt
const contextMessage = `
## Repository Context

### Repository: ${repo.fullName} (${repo.defaultBranch})

### File Structure
${fileTree}

### Selected Files
${selectedFiles
	.map(
		f => `
#### ${f.path}
\`\`\`${f.language}
${f.content}
\`\`\`
`,
	)
	.join('\n')}

### Related Code
${semanticResults
	.map(
		r => `
#### ${r.filePath} (lines ${r.startLine}-${r.endLine})
\`\`\`${r.language}
${r.content}
\`\`\`
`,
	)
	.join('\n')}
`
```

---

## 5. Security Considerations

### 5.1 Token Storage

| Concern                  | Mitigation                                                                                                             |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| GitHub OAuth token in D1 | Already stored in `auth_account.access_token`. Encrypt at rest using AES-256-GCM with `BETTER_AUTH_SECRET`-derived key |
| PAT storage              | Store hashed, display only last 4 chars. Use Workers Secrets for encryption key                                        |
| Token refresh            | Implement refresh flow using `refresh_token` from `auth_account`. Auto-refresh when 401 received                       |
| Token scope              | Request minimal scopes: `repo` for private, `public_repo` for public-only. Never request `admin:org`                   |

### 5.2 Scope Minimization

- Default to `public_repo` scope (read-only public repos)
- Require explicit user action to upgrade to `repo` scope (read/write private repos)
- Never request webhook management scope unless user opts into real-time sync
- Display granted scopes in Settings UI

### 5.3 Rate Limit Handling

| API            | Limit                | Strategy                                                                |
| -------------- | -------------------- | ----------------------------------------------------------------------- |
| GitHub REST    | 5,000 req/hr (OAuth) | Exponential backoff, respect `X-RateLimit-Reset` header                 |
| GitHub Search  | 30 req/min           | Queue search requests, batch where possible                             |
| GitHub GraphQL | 5,000 points/hr      | Prefer GraphQL for batch operations (1 point per query vs N REST calls) |
| KV reads       | Unlimited (paid)     | Use for caching to reduce GitHub API calls                              |
| Workers AI     | Per-plan limits      | Batch embedding requests, cache results                                 |

Implementation:

```typescript
async function withRateLimit<T>(fn: () => Promise<T>): Promise<T> {
	try {
		return await fn()
	} catch (error) {
		if (
			error.status === 403 &&
			error.headers['x-ratelimit-remaining'] === '0'
		) {
			const resetAt = parseInt(error.headers['x-ratelimit-reset']) * 1000
			const waitMs = resetAt - Date.now()
			if (waitMs > 0 && waitMs < 60000) {
				await new Promise(r => setTimeout(r, waitMs))
				return fn()
			}
		}
		throw error
	}
}
```

### 5.4 User Permission Boundaries

- Users can only link repos they have access to (verified via GitHub API)
- Repo access checked on every API call (token re-validation)
- Admin users can see all linked repos (audit), but cannot access content
- Webhook secrets verified per-repo using `X-Hub-Signature-256`

### 5.5 Webhook Security

- Verify webhook signature using HMAC SHA-256 with per-repo webhook secret
- Store webhook secret in D1 `linked_repos` (encrypted)
- Reject payloads with invalid or missing signatures
- Idempotency: deduplicate via `X-GitHub-Delivery` header stored in KV

### 5.6 Data Retention

- File content cache: 6-hour TTL in KV (auto-purged)
- File metadata: retained while repo is linked (deleted on unlink)
- Embeddings: retained while repo is linked
- Webhook delivery IDs: 24-hour TTL
- On repo unlink: cascade delete all associated data (D1 + KV)

---

## 6. Testing Strategy

### Phase 1 Tests

| Test                          | Type        | Description                                                         |
| ----------------------------- | ----------- | ------------------------------------------------------------------- |
| `github-service.test.ts`      | Unit        | Mock Octokit: test repo listing, tree fetch, file content retrieval |
| `repos-route.test.ts`         | Integration | Test API endpoints with mocked GitHub responses                     |
| `oauth-scope-upgrade.test.ts` | Unit        | Test scope upgrade flow in auth config                              |
| `linked-repos-schema.test.ts` | Unit        | Test Drizzle schema validation and migrations                       |
| `repo-linking.e2e.ts`         | E2E         | Full flow: Settings → Connect GitHub → Link repo → Verify in DB     |

### Phase 2 Tests

| Test                   | Type        | Description                                          |
| ---------------------- | ----------- | ---------------------------------------------------- |
| `repo-indexer.test.ts` | Unit        | Test indexing logic with mocked tree responses       |
| `kv-cache.test.ts`     | Unit        | Test cache set/get/TTL behavior                      |
| `sync-logic.test.ts`   | Integration | Test incremental sync (changed files detection)      |
| `file-tree-ui.test.ts` | Component   | Test tree rendering, expand/collapse, file selection |

### Phase 3 Tests

| Test                        | Type        | Description                                                                                     |
| --------------------------- | ----------- | ----------------------------------------------------------------------------------------------- |
| `context-builder.test.ts`   | Unit        | Test token budget enforcement, truncation, priority                                             |
| `enrich-prompt.test.ts`     | Integration | Test context injection in BridgeAgent message flow                                              |
| `context-picker.test.ts`    | Component   | Test UI file selection, token estimation                                                        |
| `agent-with-context.e2e.ts` | E2E         | Full flow: link repo → open chat → attach context → send prompt → verify agent receives context |

### Phase 4 Tests

| Test                     | Type        | Description                                      |
| ------------------------ | ----------- | ------------------------------------------------ |
| `pr-diff-parser.test.ts` | Unit        | Test diff parsing into hunks with context        |
| `pr-review.test.ts`      | Integration | Test review generation + GitHub comment posting  |
| `diff-viewer.test.ts`    | Component   | Test diff rendering with syntax highlighting     |
| `pr-review-flow.e2e.ts`  | E2E         | Full flow: select PR → AI review → post comments |

### Phase 5 Tests

| Test                         | Type        | Description                                            |
| ---------------------------- | ----------- | ------------------------------------------------------ |
| `embedding-pipeline.test.ts` | Unit        | Test chunk generation, embedding, storage              |
| `semantic-search.test.ts`    | Integration | Test query → embedding → similarity search             |
| `error-mapping.test.ts`      | Unit        | Test stack trace parsing → file/line extraction        |
| `debug-with-context.e2e.ts`  | E2E         | Full flow: paste error → auto-context → agent response |

### Test Infrastructure

- **Mocking**: Use `msw` (Mock Service Worker) for GitHub API mocking
- **Fixtures**: Store sample GitHub API responses in `__fixtures__/` directories
- **CI**: Add test step to `turbo.json` pipeline
- **Coverage**: Target 80% for service layer, 70% for routes, 60% for UI components

---

## 7. File Structure

```
packages/
├── api/src/
│   ├── routes/
│   │   └── repos.ts                    # New: /api/repos/* routes
│   ├── services/
│   │   ├── github.ts                   # New: GitHub API client
│   │   ├── repo-indexer.ts             # New: Indexing + sync logic
│   │   ├── context-builder.ts          # New: Context assembly + token budget
│   │   └── pr-review.ts               # New: PR review engine
│   └── middleware/
│       └── github-auth.ts              # New: GitHub token validation + refresh
├── db/src/
│   └── schema.ts                       # Modified: add linkedRepos, repoFiles, repoEmbeddings
├── shared/src/
│   ├── schema/
│   │   └── github-repo.ts             # New: Zod schemas
│   └── index.ts                        # Modified: export new schemas
apps/
├── web/
│   ├── app/
│   │   ├── components/
│   │   │   ├── RepoFileTree.tsx         # New: File tree component
│   │   │   ├── RepoContextPicker.tsx    # New: Context selection for chat
│   │   │   └── DiffViewer.tsx          # New: PR diff viewer
│   │   ├── repos/
│   │   │   ├── page.tsx                # New: Linked repos list
│   │   │   └── [id]/
│   │   │       ├── page.tsx            # New: Repo detail + file tree
│   │   │       └── prs/
│   │   │           └── [number]/
│   │   │               └── page.tsx    # New: PR review page
│   │   └── settings/
│   │       └── page.tsx                # Modified: add GitHub repo section
│   └── worker/
│       ├── bridge-agent.ts             # Modified: add context enrichment
│       └── index.ts                    # Modified: mount repos routes
```

---

## 8. Dependencies & Risks

### External Dependencies

| Dependency                     | Risk   | Mitigation                                                 |
| ------------------------------ | ------ | ---------------------------------------------------------- |
| GitHub API availability        | High   | Cache aggressively, graceful degradation to cached data    |
| GitHub OAuth scope changes     | Medium | Document scope requirements, handle re-auth gracefully     |
| Workers AI embedding quality   | Medium | Test with real codebases, allow fallback to keyword search |
| tree-sitter WASM compatibility | Low    | Use pre-built WASM grammars, test in Workers runtime       |

### Technical Risks

| Risk                     | Impact                           | Mitigation                                         |
| ------------------------ | -------------------------------- | -------------------------------------------------- |
| Token limit exceeded     | Agent receives truncated context | Strict token budgeting, priority-based truncation  |
| Large repos (>10K files) | Slow indexing, high API usage    | Lazy indexing, pagination, size limits             |
| Rate limiting            | Blocked API access               | Aggressive caching, backoff, GraphQL for batch ops |
| KV storage costs         | Unexpected billing               | TTL-based eviction, size limits per cache entry    |

---

## 9. Milestone Timeline

| Week | Phase   | Key Deliverable                                 |
| ---- | ------- | ----------------------------------------------- |
| 1-2  | Phase 1 | Users can link GitHub repos via Settings        |
| 3    | Phase 2 | Linked repos are indexed with cached file trees |
| 4-5  | Phase 3 | Agent prompts enriched with repo context        |
| 6-7  | Phase 4 | Automated PR review with inline comments        |
| 8    | Phase 5 | Code-aware debugging with semantic search       |

---

_Plan created: March 2026_
_Estimated total effort: 8 weeks (1 engineer)_
