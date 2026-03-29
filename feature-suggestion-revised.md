# Feature Suggestions for Happy Vibecode — Revised

This document outlines feature enhancements based on codebase review. Each suggestion includes implementation status, brief description, rationale, and priority.

---

## Status Legend

- ✅ **Implemented** — Feature exists in codebase
- ⚠️ **Partially Implemented** — Foundation exists, needs extension
- ❌ **Not Implemented** — Planned feature, no code exists

---

## 1. Flexible LLM Provider Configuration

**Status**: ⚠️ Partially Implemented

The `llmProviderSchema` in `packages/shared/src/schema/llm-provider.ts` already defines supported providers (gemini, claude, codex, opencode-ai, copilot, kilo, cline, custom). The `workspaces` table has `defaultProvider` and `defaultModel` fields. Agent definitions support per-agent command/args configuration. However, there is no UI for dynamically switching providers mid-session or a provider abstraction layer.

### Remaining Work

- Provider selection UI in chat interface (switch model/provider per-session)
- Provider capability metadata (max tokens, pricing, features)
- Fallback chain configuration (if primary provider fails)

### Priority

**Medium** — Foundation exists, UI polish needed

### Files

- `packages/shared/src/schema/llm-provider.ts` ✅
- `packages/db/src/schema.ts` (workspaces table) ✅
- `apps/web/app/settings/page.tsx` — needs provider config section

---

## 2. Real-Time Collaboration Features

**Status**: ❌ Not Implemented

The BridgeAgent Durable Object currently isolates rooms by userId. Multi-user collaboration would require shared room access and permission model.

### Priority

**Low** — Significant architectural change, deferred

---

## 3. Webhook Integration System

**Status**: ⚠️ Partially Implemented

Stripe webhook handler exists at `packages/api/src/routes/billing.ts` with signature verification pattern. This serves as a template for additional webhook integrations. No generic webhook framework exists.

### Remaining Work

- Generic webhook dispatcher (route events to handlers)
- GitHub webhook handler (for repo sync triggers — covered by GitHub Integration plan)
- Slack/Discord notification webhooks
- Webhook configuration UI for users

### Priority

**Medium** — Stripe pattern exists, needs generalization

### Files

- `packages/api/src/routes/billing.ts` ✅ (Stripe webhook reference)

---

## 4. Enhanced Mobile App Features

**Status**: ⚠️ Partially Implemented

Push notifications are fully implemented (`packages/api/src/services/push-notifications.ts` with FCM + APNs). Device token registration exists. Notification preferences are configurable. However, biometric auth, offline mode, and mobile agent control are not implemented.

### Implemented

- ✅ Push notifications (FCM + APNs)
- ✅ Device token registration (`/api/devices`)
- ✅ Notification preferences (`/api/notifications`)
- ✅ GitHub OAuth on mobile (`apps/mobile/app/(tabs)/settings.tsx`)
- ✅ Chat session viewing on mobile

### Remaining Work

- Biometric authentication (Face ID / fingerprint)
- Offline mode with sync queue (partially: `offlineSyncQueue` table exists)
- Full agent control from mobile (start/stop/configure agents)

### Priority

**Medium** — Core push infra done, UX features remain

### Files

- `packages/api/src/services/push-notifications.ts` ✅
- `packages/api/src/routes/devices.ts` ✅
- `packages/api/src/routes/notifications.ts` ✅
- `packages/db/src/schema.ts` (deviceTokens, notificationPreferences) ✅
- `apps/mobile/hooks/useAuth.ts` ✅

---

## 5. Agent Session Analytics Dashboard

**Status**: ✅ Implemented

Admin analytics dashboard exists at `apps/web/app/admin/analytics/page.tsx` with routes in `packages/api/src/routes/admin-analytics.ts`. Provides DAU/WAU/MAU, signup trends, session metrics, and agent usage statistics.

### Implemented

- ✅ Admin analytics overview
- ✅ User activity metrics (DAU/WAU/MAU)
- ✅ Signup trend tracking
- ✅ Session metrics
- ✅ Agent usage statistics

### Remaining Work

- Per-user cost breakdown by provider
- Token usage tracking (not yet captured in message_logs)
- User-facing analytics (not just admin)

### Priority

**Low** — Admin dashboard complete, user-facing views optional

### Files

- `apps/web/app/admin/analytics/page.tsx` ✅
- `packages/api/src/routes/admin-analytics.ts` ✅

---

## 6. GitHub Repository Integration

**Status**: ❌ Not Implemented

GitHub OAuth exists for authentication only (`apps/web/worker/auth.ts`). No GitHub API integration for repository access, code indexing, or PR review. The `auth_account` table stores OAuth tokens that can be leveraged for API access.

### Implementation Plan

See `Plans/github-repository-integration.md` for the full 5-phase plan.

### Priority

**High** — Core differentiator for the platform

### Files

- `apps/web/worker/auth.ts` ✅ (OAuth foundation)
- `packages/db/src/schema.ts` (authAccount) ✅ (token storage)

---

## 7. Custom Agent Templates

**Status**: ✅ Implemented

Full template system exists with versioning, public/private sharing, duplication, and instantiation.

### Implemented

- ✅ Template CRUD (`packages/api/src/routes/agent-templates.ts`)
- ✅ Versioned templates (`agent_templates` + `agent_template_versions` tables)
- ✅ Public/private sharing
- ✅ Template duplication
- ✅ Template instantiation (creates session from template)
- ✅ UI: template list, create, edit, detail pages
- ✅ Zod schemas (`packages/shared/src/schema/agent-template.ts`)

### Priority

**Complete** — No further work needed

### Files

- `packages/api/src/routes/agent-templates.ts` ✅
- `packages/db/src/schema.ts` (agentTemplates, agentTemplateVersions) ✅
- `packages/shared/src/schema/agent-template.ts` ✅
- `apps/web/app/templates/` ✅

---

## 8. Plugin/Extension System

**Status**: ❌ Not Implemented

No plugin architecture exists. Agent capabilities are defined by external CLI tools.

### Priority

**Low** — Complex architecture, not aligned with current bridge-pattern design

---

## 9. Multi-Language Support

**Status**: ❌ Not Implemented

No i18n infrastructure exists. All UI strings are hardcoded in components.

### Priority

**Low** — Requires significant refactoring of all UI components

---

## 10. Advanced Rate Limiting & Quotas

**Status**: ⚠️ Partially Implemented

Subscription tiers exist (`planTier: free|pro` in users table, Stripe integration for Pro). However, no per-tier rate limiting or quota enforcement is implemented.

### Implemented

- ✅ Subscription tiers (free/pro)
- ✅ Stripe billing integration
- ✅ Subscription status tracking

### Remaining Work

- Request rate limiting per tier
- Token quota enforcement
- Concurrent session limits
- Rate limit middleware in API

### Priority

**High** — Needed before scaling to many users

### Files

- `packages/db/src/schema.ts` (users.planTier, subscriptionStatus) ✅
- `packages/api/src/routes/billing.ts` ✅

---

## 11. Session Recording & Playback

**Status**: ⚠️ Partially Implemented

Message history is persisted to D1 (`message_logs` table) with session association. Sessions can be queried via `/api/sessions/:id/messages`. However, there is no playback UI or timing reconstruction.

### Implemented

- ✅ Message persistence (user + assistant messages)
- ✅ Session message history API
- ✅ History page (`apps/web/app/history/page.tsx`)

### Remaining Work

- Playback UI with timing reconstruction
- Session export functionality
- Search across session history

### Priority

**Low** — Core persistence exists, playback is a nice-to-have

### Files

- `packages/db/src/schema.ts` (messageLogs) ✅
- `packages/api/src/routes/sessions.ts` ✅
- `apps/web/app/history/page.tsx` ✅

---

## 12. Better Error Handling & Recovery

**Status**: ⚠️ Partially Implemented

### Implemented

- ✅ WebSocket reconnection with exponential backoff (CLI `connect.ts`)
- ✅ Connection status tracking (`connectionStatus` enum in agent_sessions)
- ✅ Error message relay via WebSocket `error` type
- ✅ Push notifications on agent error
- ✅ Offline sync queue for failed actions

### Remaining Work

- Client-side reconnection logic (web chat auto-reconnect)
- API timeout handling with retry
- Agent crash recovery (restart CLI agent on crash)
- User-facing error recovery suggestions

### Priority

**Medium** — Core error handling exists, recovery UX needs work

### Files

- `apps/web/worker/bridge-agent.ts` ✅
- `packages/cli/src/commands/connect.ts` ✅
- `apps/web/app/chat/Chat.tsx` — needs auto-reconnect

---

## Priority Summary (Revised)

| Priority     | Features                                                                                | Status                |
| ------------ | --------------------------------------------------------------------------------------- | --------------------- |
| **High**     | GitHub Repository Integration (#6), Rate Limiting & Quotas (#10)                        | Not started           |
| **Medium**   | LLM Provider Config (#1), Webhooks (#3), Mobile Enhancements (#4), Error Handling (#12) | Partially implemented |
| **Low**      | Real-Time Collaboration (#2), Plugin System (#8), i18n (#9), Session Playback (#11)     | Not started           |
| **Complete** | Agent Templates (#7), Analytics Dashboard (#5)                                          | Fully implemented     |

---

## New Feature Suggestions

Building on the existing roadmap and the GitHub Repository Integration plan, here are 5 new features aligned with the project's trajectory:

### 13. Multi-Repo Workspace Composition

**Priority**: High (post GitHub Integration)

Allow users to compose a workspace from multiple repositories. A workspace could include a frontend repo, backend repo, and shared library — all accessible to the agent simultaneously.

**Rationale**: Real-world projects span multiple repos. The agent should understand cross-repo dependencies and imports.

**Scope**:

- Workspace → multiple linked_repos association
- Cross-repo search and context retrieval
- Dependency graph awareness (package.json, go.mod, requirements.txt parsing)

**Dependencies**: Feature #6 (GitHub Repository Integration)

---

### 14. Diff-Aware Code Suggestions with Auto-Apply

**Priority**: Medium (post GitHub Integration Phase 4)

When the agent suggests code changes, generate proper diffs that can be directly committed to GitHub as commits or applied to open PRs.

**Rationale**: Currently agent responses are text. Diff-aware suggestions enable one-click application of AI-generated fixes.

**Scope**:

- Parse agent responses for code blocks with file path annotations
- Generate unified diffs from suggestions
- One-click "Commit suggestion" → GitHub API commit creation
- Branch management for suggestions (create branch, commit, open PR)

**Dependencies**: Feature #6 (GitHub Repository Integration)

---

### 15. CI/CD Pipeline Integration

**Priority**: Medium

Integrate with GitHub Actions (and other CI providers) to give the agent awareness of build/test status.

**Rationale**: When debugging a failing build, the agent needs access to CI logs, test results, and build artifacts. This closes the loop between code → CI → debugging.

**Scope**:

- GitHub Actions workflow run status in agent context
- CI log streaming to agent on failure
- "Fix failing CI" prompt template that auto-pulls logs + related code
- Support for other providers: GitLab CI, CircleCI (future)

**Dependencies**: Feature #6, Feature #3 (Webhooks)

---

### 16. Local-First Offline Mode

**Priority**: Medium

Enable the full agent workflow to function offline, with sync when connectivity returns. The `offlineSyncQueue` table already exists for queuing actions.

**Rationale**: Developers work in environments with unreliable connectivity (flights, trains, rural areas). The CLI already runs locally — the bridge should handle offline gracefully.

**Scope**:

- CLI agent runs fully offline (already works — CLI is local)
- Queue web/mobile prompts in `offlineSyncQueue` when WebSocket is disconnected
- Auto-sync and reconcile on reconnection
- Offline repo context: cache file content locally in browser (IndexedDB) or on CLI side
- Conflict resolution for concurrent edits

**Dependencies**: Existing offline sync infrastructure (`packages/api/src/routes/sync.ts`)

---

### 17. Agent Skill Marketplace

**Priority**: Low (long-term)

The `.agents/skills/` directory contains agent skill definitions. Extend this into a user-facing marketplace where users can discover, install, and share agent configurations (templates + skills + provider settings).

**Rationale**: The template system exists but is isolated. A marketplace creates community value and differentiates the platform.

**Scope**:

- Browse/search public templates and skills
- One-click install into user's workspace
- Rating and usage statistics
- Curated collections (e.g., "Python debugging", "React development")
- Creator profiles and contribution tracking

**Dependencies**: Feature #7 (Agent Templates — already complete)

---

## Feature Status Matrix

| #   | Feature                 | Status         | Priority | Dependencies        |
| --- | ----------------------- | -------------- | -------- | ------------------- |
| 1   | LLM Provider Config     | ⚠️ Partial     | Medium   | None                |
| 2   | Real-Time Collaboration | ❌ Not started | Low      | None                |
| 3   | Webhooks                | ⚠️ Partial     | Medium   | None                |
| 4   | Mobile Enhancements     | ⚠️ Partial     | Medium   | None                |
| 5   | Analytics Dashboard     | ✅ Complete    | —        | None                |
| 6   | GitHub Integration      | ❌ Not started | High     | None                |
| 7   | Custom Templates        | ✅ Complete    | —        | None                |
| 8   | Plugin System           | ❌ Not started | Low      | None                |
| 9   | Multi-Language          | ❌ Not started | Low      | None                |
| 10  | Rate Limiting           | ⚠️ Partial     | High     | None                |
| 11  | Session Playback        | ⚠️ Partial     | Low      | None                |
| 12  | Error Handling          | ⚠️ Partial     | Medium   | None                |
| 13  | Multi-Repo Workspaces   | ❌ New         | High     | #6                  |
| 14  | Diff-Aware Suggestions  | ❌ New         | Medium   | #6                  |
| 15  | CI/CD Integration       | ❌ New         | Medium   | #6, #3              |
| 16  | Local-First Offline     | ❌ New         | Medium   | Existing sync infra |
| 17  | Skill Marketplace       | ❌ New         | Low      | #7 (complete)       |

---

_Revised: March 2026_
_Based on codebase review of happy-vibecode monorepo_
