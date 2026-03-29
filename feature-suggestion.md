# Feature Roadmap — Happy Vibecode

This document tracks unimplemented and partially implemented features. Each entry includes implementation status, acceptance criteria, and notes for contributors.

---

## Status Legend

- ⚠️ **Partial** — Foundation exists, needs extension
- ❌ **Not Started** — Planned feature, no code exists

---

## Priority Summary

| Priority   | #   | Feature                          | Status         |
| ---------- | --- | -------------------------------- | -------------- |
| **High**   | 1   | GitHub Repository Integration    | ⚠️ Partial     |
| **High**   | 2   | LLM Provider Configuration UI    | ⚠️ Partial     |
| **High**   | 3   | Multi-Repo Workspace Composition | ❌ Not Started |
| **Medium** | 4   | Webhook Integration System       | ⚠️ Partial     |
| **Medium** | 5   | Enhanced Mobile App Features     | ⚠️ Partial     |
| **Medium** | 6   | Error Handling & Recovery        | ⚠️ Partial     |
| **Medium** | 7   | Diff-Aware Code Suggestions      | ❌ Not Started |
| **Medium** | 8   | CI/CD Pipeline Integration       | ❌ Not Started |
| **Medium** | 9   | Local-First Offline Mode         | ⚠️ Partial     |
| **Low**    | 10  | Real-Time Collaboration          | ❌ Not Started |
| **Low**    | 11  | Session Recording & Playback     | ⚠️ Partial     |
| **Low**    | 12  | Plugin/Extension System          | ❌ Not Started |
| **Low**    | 13  | Multi-Language Support (i18n)    | ❌ Not Started |
| **Low**    | 14  | Agent Skill Marketplace          | ❌ Not Started |

---

## 1. GitHub Repository Integration

**Status**: ⚠️ Partial | **Priority**: High

### Implemented

- GitHub OAuth authentication (`apps/web/worker/auth.ts`)
- `GitHubService` class with Octokit integration (repo listing, tree, file content, code search)
- `RepoIndexer` service with batch file indexing and language detection
- Full REST API at `/api/repos` (CRUD, sync, index, tree, files, search)
- D1 tables: `linked_repos`, `repo_files`, `repo_embeddings`
- Settings UI for linking repositories

### Remaining Work

- [ ] PR review engine with inline comments
- [ ] Diff parsing and code suggestion generation
- [ ] Webhook-driven automatic sync on push events
- [ ] Semantic code search using embeddings

### Acceptance Criteria

- Users can link GitHub repos and the agent can search across indexed code
- PR reviews can be generated from agent conversations
- Repository changes trigger automatic re-indexing via webhooks

### Files

- `packages/api/src/services/github.ts` ✅
- `packages/api/src/services/repo-indexer.ts` ✅
- `packages/api/src/routes/repos.ts` ✅
- `packages/db/src/schema.ts` (linkedRepos, repoFiles, repoEmbeddings) ✅
- `packages/shared/src/schema/github-repo.ts` ✅

### Dependencies

None — Phase 1 foundation complete.

---

## 2. LLM Provider Configuration UI

**Status**: ⚠️ Partial | **Priority**: High

### Implemented

- Provider type system (`packages/shared/src/schema/llm-provider.ts`)
- Supported: gemini, claude, codex, opencode-ai, copilot, kilo, cline, custom
- Workspace `defaultProvider` and `defaultModel` fields in D1
- Settings page provider selection UI (`apps/web/app/settings/page.tsx`)
- CLI agent per-provider command/args configuration

### Remaining Work

- [ ] Per-session provider switching in chat UI (switch model mid-conversation)
- [ ] Provider capability metadata (max tokens, pricing, supported features)
- [ ] Fallback chain configuration (auto-switch if primary provider fails)

### Acceptance Criteria

- Users can switch LLM provider/model within a chat session
- Provider capabilities are displayed in the UI (context window, pricing)
- Failed provider requests fall back to a configured alternative

### Files

- `packages/shared/src/schema/llm-provider.ts` ✅
- `packages/shared/src/schema/provider-capabilities.ts` ✅
- `packages/db/src/schema.ts` (workspaces table) ✅
- `apps/web/app/settings/page.tsx` ✅

### Dependencies

None.

---

## 3. Multi-Repo Workspace Composition

**Status**: ❌ Not Started | **Priority**: High

### Description

Allow users to compose a workspace from multiple repositories. A workspace could include a frontend repo, backend repo, and shared library — all accessible to the agent simultaneously.

### Remaining Work

- [ ] Workspace-to-multiple-linked-repos association table
- [ ] Cross-repo search and context retrieval
- [ ] Dependency graph awareness (package.json, go.mod, requirements.txt parsing)
- [ ] UI for managing repos within a workspace

### Acceptance Criteria

- A workspace can have multiple linked repositories
- Agent can search across all repos in the workspace
- Cross-repo imports are detected and included in context

### Dependencies

Feature #1 (GitHub Repository Integration — Phase 1 complete).

---

## 4. Webhook Integration System

**Status**: ⚠️ Partial | **Priority**: Medium

### Implemented

- Stripe webhook handler at `POST /api/billing/webhook` with HMAC signature verification
- `webhookId` field in `linked_repos` table for future GitHub webhooks

### Remaining Work

- [ ] Generic webhook dispatcher (route events to handler functions)
- [ ] GitHub webhook handler (push, PR events for repo sync triggers)
- [ ] Slack/Discord notification webhooks for agent events
- [ ] User-facing webhook configuration UI

### Acceptance Criteria

- External services can receive callbacks on agent session events
- GitHub push events trigger automatic repo re-indexing
- Users can configure notification webhooks from the settings page

### Files

- `packages/api/src/routes/billing.ts` ✅ (Stripe webhook reference)

### Dependencies

None.

---

## 5. Enhanced Mobile App Features

**Status**: ⚠️ Partial | **Priority**: Medium

### Implemented

- Push notifications (FCM + APNs) via `packages/api/src/services/push-notifications.ts`
- Device token registration at `POST /api/devices`
- Notification preferences at `GET/PUT /api/notifications`
- Biometric authentication (`useBiometric` hook + `BiometricGate` component)
- Offline read cache (`apps/mobile/lib/offline-cache.ts`)
- GitHub OAuth on mobile (`apps/mobile/app/(tabs)/settings.tsx`)

### Remaining Work

- [ ] Full agent control from mobile (start/stop/configure agents)
- [ ] Offline sync queue flushing on reconnect
- [ ] Network status-aware UI transitions

### Acceptance Criteria

- Users can start and stop agent sessions from the mobile app
- Offline actions are synced when connectivity returns
- UI adapts gracefully to connectivity changes

### Files

- `packages/api/src/services/push-notifications.ts` ✅
- `packages/api/src/routes/devices.ts` ✅
- `packages/api/src/routes/notifications.ts` ✅
- `apps/mobile/hooks/useBiometric.ts` ✅
- `apps/mobile/lib/offline-cache.ts` ✅

### Dependencies

None.

---

## 6. Error Handling & Recovery

**Status**: ⚠️ Partial | **Priority**: Medium

### Implemented

- WebSocket reconnection with exponential backoff (CLI `connect.ts`)
- Web chat auto-reconnect (`apps/web/app/chat/Chat.tsx`)
- API fetch retry utility (`packages/api/src/lib/fetch-with-retry.ts`)
- Connection status tracking in `agent_sessions` table
- Error message relay via WebSocket `error` type
- Push notifications on agent error

### Remaining Work

- [ ] Agent crash recovery (auto-restart CLI agent on crash)
- [ ] User-facing error recovery suggestions
- [ ] Structured error codes for API responses

### Acceptance Criteria

- WebSocket disconnections auto-reconnect without user intervention
- Agent crashes are detected and recovery is attempted
- Error messages include actionable recovery suggestions

### Files

- `apps/web/worker/bridge-agent.ts` ✅
- `packages/cli/src/commands/connect.ts` ✅
- `apps/web/app/chat/Chat.tsx` ✅
- `packages/api/src/lib/fetch-with-retry.ts` ✅

### Dependencies

None.

---

## 7. Diff-Aware Code Suggestions

**Status**: ❌ Not Started | **Priority**: Medium

### Description

When the agent suggests code changes, generate proper diffs that can be directly committed to GitHub as commits or applied to open PRs.

### Remaining Work

- [ ] Parse agent responses for code blocks with file path annotations
- [ ] Generate unified diffs from suggestions
- [ ] One-click "Commit suggestion" using GitHub API
- [ ] Branch management for suggestions (create branch, commit, open PR)

### Acceptance Criteria

- Agent code suggestions are formatted as diffs with file paths
- Users can apply suggestions directly to GitHub repos
- Suggestions create branches and PRs automatically

### Dependencies

Feature #1 (GitHub Repository Integration).

---

## 8. CI/CD Pipeline Integration

**Status**: ❌ Not Started | **Priority**: Medium

### Description

Integrate with GitHub Actions to give the agent awareness of build/test status.

### Remaining Work

- [ ] GitHub Actions workflow run status in agent context
- [ ] CI log streaming to agent on failure
- [ ] "Fix failing CI" prompt template that auto-pulls logs + related code
- [ ] Support for other providers: GitLab CI, CircleCI (future)

### Acceptance Criteria

- Agent can access CI build status for linked repos
- Failed builds automatically pull logs into agent context
- Agent can suggest fixes based on CI error logs

### Dependencies

Feature #1 (GitHub Repository Integration), Feature #4 (Webhooks).

---

## 9. Local-First Offline Mode

**Status**: ⚠️ Partial | **Priority**: Medium

### Implemented

- `offline_sync_queue` D1 table with action queuing
- Zod schemas for offline queue items (`packages/shared/src/schema/offline-sync.ts`)
- Sync API route for queue operations (`packages/api/src/routes/sync.ts`)
- Mobile offline read cache with TTL (`apps/mobile/lib/offline-cache.ts`)

### Remaining Work

- [ ] Queue flushing on WebSocket reconnect
- [ ] IndexedDB offline cache for web (browser-side)
- [ ] Conflict resolution for concurrent edits
- [ ] Network status hook for web (`useNetworkStatus` exists for mobile only)

### Acceptance Criteria

- Web and mobile clients queue actions when offline
- Actions auto-sync when connectivity returns
- Conflicts are resolved with last-write-wins or user prompt

### Dependencies

Existing offline sync infrastructure (`packages/api/src/routes/sync.ts`).

---

## 10. Real-Time Collaboration

**Status**: ❌ Not Started | **Priority**: Low

### Description

Enable multiple users to collaborate in the same agent session with shared chat history and synchronized responses.

### Remaining Work

- [ ] Shared room access beyond single userId
- [ ] Multi-user permission model (owner, editor, viewer)
- [ ] Real-time cursor/presence indicators
- [ ] Session sharing via invite link

### Acceptance Criteria

- Multiple users can join the same agent session
- Chat history is synchronized across participants
- Permission levels control who can send messages vs. view only

### Dependencies

None — but requires significant architectural changes to BridgeAgent.

---

## 11. Session Recording & Playback

**Status**: ⚠️ Partial | **Priority**: Low

### Implemented

- Message persistence to D1 (`message_logs` table)
- Session message history API (`GET /api/sessions/:id/messages`)
- History browsing page (`apps/web/app/history/page.tsx`)

### Remaining Work

- [ ] Playback UI with timing reconstruction
- [ ] Session export (JSON, Markdown)
- [ ] Search across session history

### Acceptance Criteria

- Users can replay past sessions with accurate timing
- Sessions can be exported in standard formats
- Full-text search across all session messages

### Files

- `packages/db/src/schema.ts` (messageLogs) ✅
- `packages/api/src/routes/sessions.ts` ✅
- `apps/web/app/history/page.tsx` ✅

### Dependencies

None.

---

## 12. Plugin/Extension System

**Status**: ❌ Not Started | **Priority**: Low

### Description

Create a plugin architecture that allows extending agent capabilities with custom tools and integrations.

### Remaining Work

- [ ] Plugin manifest schema (name, version, capabilities, entry point)
- [ ] Plugin loader and sandboxed execution
- [ ] Plugin registry and discovery
- [ ] API for plugin-to-agent communication

### Acceptance Criteria

- Third-party developers can create plugins for the platform
- Plugins can add custom tools and integrations
- Plugins are sandboxed and cannot access unauthorized resources

### Dependencies

None.

---

## 13. Multi-Language Support (i18n)

**Status**: ❌ Not Started | **Priority**: Low

### Description

Add internationalization support for web and mobile interfaces.

### Remaining Work

- [ ] i18n framework integration (e.g., next-intl, react-intl)
- [ ] Extract all hardcoded UI strings to locale files
- [ ] Language switcher component
- [ ] RTL layout support

### Acceptance Criteria

- UI can be displayed in multiple languages
- Language preference is persisted per-user
- All user-facing strings are translatable

### Dependencies

None — requires significant refactoring of all UI components.

---

## 14. Agent Skill Marketplace

**Status**: ❌ Not Started | **Priority**: Low

### Description

Extend the template system into a user-facing marketplace where users can discover, install, and share agent configurations (templates + skills + provider settings).

### Remaining Work

- [ ] Browse/search public templates and skills
- [ ] One-click install into user's workspace
- [ ] Rating and usage statistics
- [ ] Curated collections (e.g., "Python debugging", "React development")
- [ ] Creator profiles and contribution tracking

### Acceptance Criteria

- Users can browse and install public agent configurations
- Creators can publish and track usage of their templates
- Curated collections help users discover relevant configurations

### Dependencies

Feature #7 Agent Templates (already complete).

---

_Last updated: March 2026_
_Based on cross-referencing feature-suggestion.md and feature-suggestion-revised.md against the codebase._
