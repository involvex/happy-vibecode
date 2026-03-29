---
goal: Enhanced Mobile App Features + Custom Agent Templates
version: 1.0
date_created: 2026-03-28
last_updated: 2026-03-28
owner: Happy Vibecode Team
status: 'Planned'
tags: [feature, mobile, agent-templates, push-notifications, biometric, offline]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan implements two major features: (1) Enhanced Mobile App Features including push notifications for agent tasks, biometric authentication, offline mode with action queuing, and real-time agent control from mobile; and (2) Custom Agent Templates enabling users to create, version, share, and instantiate reusable agent configurations with a personal + public sharing model.

**Architectural Decisions (confirmed by user):**

- Push notifications: Direct FCM/APNs API calls from Cloudflare Worker (no third-party service)
- Offline mode: Queue-only approach (queue actions offline, replay on reconnect, cache last-known reads)
- Biometric auth: App unlock gate (biometric required to unlock app after initial login)
- Template sharing: Personal templates with public toggle (no team/organization infrastructure)
- Template architecture: Separate `agent_templates` + `agent_template_versions` tables (not extending existing `agents` table)

## 1. Requirements & Constraints

- **REQ-001**: Push notifications must work on both iOS (APNs) and Android (FCM) via a unified backend service
- **REQ-002**: Push notification triggers must fire when agent session status changes (completed, error, requires input)
- **REQ-003**: Biometric auth must support Face ID, Touch ID (iOS), and fingerprint/face (Android) via a single API
- **REQ-004**: Biometric auth must be optional and layered on top of existing Better Auth flow
- **REQ-005**: Offline mode must queue user prompts and setting changes, replaying them when connectivity restores
- **REQ-006**: Offline mode must show cached session/message data when offline
- **REQ-007**: Agent control from mobile must support start/stop agents, view real-time logs, and adjust task parameters
- **REQ-008**: Agent templates must encapsulate prompt templates, default model, tool assignments, parameter defaults, tags, description
- **REQ-009**: Templates must be versioned — updates create new versions without breaking existing agent instances
- **REQ-010**: Templates must support personal ownership with optional public sharing toggle
- **REQ-011**: Users must be able to instantiate agents from templates (creates agent session from template config)
- **REQ-012**: All new API endpoints must use existing auth middleware pattern
- **SEC-001**: Push notification tokens must be stored securely and associated with authenticated users only
- **SEC-002**: Biometric data never leaves the device — only the authentication result is used
- **SEC-003**: Template access must respect ownership — only owners can edit/delete, public templates are read-only for others
- **CON-001**: Must run on Cloudflare Workers (no traditional Node.js server)
- **CON-002**: D1 (SQLite) is the only database — no PostgreSQL/MySQL
- **CON-003**: Mobile app must remain compatible with Expo Go via shims where possible
- **CON-004**: Must not break existing WebSocket protocol between BridgeAgent and CLI
- **GUD-001**: Follow existing Hono route pattern with Zod validation and Drizzle ORM
- **GUD-002**: Follow existing mobile hook pattern (custom hooks with SecureStore/AsyncStorage persistence)
- **PAT-001**: Use existing `device_tokens` table for push tokens (already exists in schema)
- **PAT-002**: Use existing `authMiddleware` for all new protected routes
- **PAT-003**: Shared schemas go in `packages/shared/src/schema/`, exported from `index.ts`

## 2. Implementation Steps

### Implementation Phase 1: Shared Schemas & Database Schema

- GOAL-001: Define all new shared Zod schemas and database tables required by both features

| Task     | Description                                                                                                                                                                                                             | Completed | Date |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-001 | Create `packages/shared/src/schema/agent-template.ts` with Zod schemas for agent templates, versions, and instantiation                                                                                                 |           |      |
| TASK-002 | Create `packages/shared/src/schema/notification.ts` with Zod schemas for notification preferences, push payloads                                                                                                        |           |      |
| TASK-003 | Create `packages/shared/src/schema/offline-sync.ts` with Zod schemas for offline queue items                                                                                                                            |           |      |
| TASK-004 | Export new schemas from `packages/shared/src/index.ts`                                                                                                                                                                  |           |      |
| TASK-005 | Add `agent_templates` table to `packages/db/src/schema.ts` with columns: id, userId, name, description, tags (JSON), isPublic, latestVersionId, createdAt, updatedAt                                                    |           |      |
| TASK-006 | Add `agent_template_versions` table to `packages/db/src/schema.ts` with columns: id, templateId, version, promptTemplate, defaultModel, defaultProvider, tools (JSON), parameters (JSON), changeNotes, createdAt        |           |      |
| TASK-007 | Add `notification_preferences` table to `packages/db/src/schema.ts` with columns: id, userId, agentCompleted (bool), agentError (bool), agentRequiresInput (bool), quietHoursStart, quietHoursEnd, createdAt, updatedAt |           |      |
| TASK-008 | Add `offline_sync_queue` table to `packages/db/src/schema.ts` with columns: id, userId, action (enum), payload (JSON), status (enum: pending/processing/completed/failed), createdAt, processedAt                       |           |      |
| TASK-009 | Add Drizzle relations for new tables (agent_templates → users, agent_template_versions → agent_templates, etc.)                                                                                                         |           |      |
| TASK-010 | Generate migration file via `bun run -F @happy-vibecode/db generate`                                                                                                                                                    |           |      |

### Implementation Phase 2: Push Notification Backend

- GOAL-002: Implement push notification sending from Cloudflare Worker using direct FCM/APNs API calls

| Task     | Description                                                                                                                                                                     | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-011 | Create `packages/api/src/services/push-notifications.ts` — service class with `sendToUser(userId, payload)` and `sendToDevice(token, platform, payload)` methods                |           |      |
| TASK-012 | Implement FCM v1 HTTP API integration in push service — OAuth2 token exchange with Firebase service account, POST to `fcm.googleapis.com/v1/projects/{projectId}/messages:send` |           |      |
| TASK-013 | Implement APNs HTTP/2 API integration in push service — JWT auth token generation, POST to `api.push.apple.com/3/device/{token}`                                                |           |      |
| TASK-014 | Create `packages/api/src/routes/notifications.ts` with endpoints: `GET /api/notifications/preferences`, `PUT /api/notifications/preferences`, `POST /api/notifications/test`    |           |      |
| TASK-015 | Add notification trigger in `apps/web/worker/bridge-agent.ts` — when session status changes to completed/error, call push service for user's registered devices                 |           |      |
| TASK-016 | Mount notifications router in `packages/api/src/index.ts`                                                                                                                       |           |      |
| TASK-017 | Add `FCM_SERVICE_ACCOUNT_KEY` and `APNS_AUTH_KEY` as wrangler secrets documentation                                                                                             |           |      |
| TASK-018 | Update `apps/web/wrangler.jsonc` env interface to include new secret types                                                                                                      |           |      |

### Implementation Phase 3: Push Notification Mobile Client

- GOAL-003: Implement push notification receiving and registration in the Expo mobile app

| Task     | Description                                                                                                                                                             | Completed | Date |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-019 | Add `expo-notifications` package to `apps/mobile/package.json`                                                                                                          |           |      |
| TASK-020 | Add `expo-device` package to `apps/mobile/package.json`                                                                                                                 |           |      |
| TASK-021 | Create `apps/mobile/hooks/usePushNotifications.ts` — hook that requests permissions, gets push token, registers with `/api/devices`, listens for incoming notifications |           |      |
| TASK-022 | Create `apps/mobile/lib/notifications.ts` — notification handler setup (foreground notification display, tap-to-navigate)                                               |           |      |
| TASK-023 | Update `apps/mobile/app/_layout.tsx` to initialize push notification listeners on app mount                                                                             |           |      |
| TASK-024 | Update `apps/mobile/app/(tabs)/settings.tsx` — wire up existing "Notifications" toggle to actually control push notification permission and preference sync             |           |      |
| TASK-025 | Update `apps/mobile/app.json` to add `expo-notifications` plugin config with iOS/Android settings                                                                       |           |      |
| TASK-026 | Create notification channel setup for Android (`apps/mobile/lib/notification-channels.ts`)                                                                              |           |      |

### Implementation Phase 4: Biometric Authentication

- GOAL-004: Implement biometric app unlock gate in the mobile app

| Task     | Description                                                                                                                                                  | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ---- |
| TASK-027 | Add `expo-local-authentication` package to `apps/mobile/package.json`                                                                                        |           |      |
| TASK-028 | Create `apps/mobile/hooks/useBiometric.ts` — hook that checks biometric hardware availability, enrolled biometrics, and provides `authenticate()` method     |           |      |
| TASK-029 | Create `apps/mobile/hooks/useAppLock.ts` — manages lock state (locked/unlocked), triggers biometric on app foreground, stores lock preference in SecureStore |           |      |
| TASK-030 | Create `apps/mobile/components/BiometricGate.tsx` — wrapper component that shows biometric prompt when app is locked                                         |           |      |
| TASK-031 | Update `apps/mobile/app/_layout.tsx` — wrap root layout with BiometricGate, listen to AppState changes for foreground lock                                   |           |      |
| TASK-032 | Update `apps/mobile/app/(tabs)/settings.tsx` — add biometric toggle in security section                                                                      |           |      |
| TASK-033 | Update `apps/mobile/hooks/useAuth.ts` — after successful login, store credentials in biometric-protected SecureStore (set `requireAuthentication` option)    |           |      |

### Implementation Phase 5: Offline Mode

- GOAL-005: Implement offline action queuing and cached read display in the mobile app

| Task     | Description                                                                                                                                                         | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-034 | Create `apps/mobile/lib/offline-queue.ts` — queue manager using AsyncStorage: `enqueue(action, payload)`, `dequeue()`, `flush(serverUrl, token)`, `getPending()`    |           |      |
| TASK-035 | Create `apps/mobile/hooks/useNetworkStatus.ts` — wraps expo-network with real-time connectivity state and reconnection detection                                    |           |      |
| TASK-036 | Create `apps/mobile/lib/offline-cache.ts` — simple read cache using AsyncStorage for sessions and messages (get/set/invalidate with TTL)                            |           |      |
| TASK-037 | Create `apps/mobile/hooks/useOfflineSync.ts` — orchestrator hook: detects connectivity changes, flushes queue on reconnect, manages sync state                      |           |      |
| TASK-038 | Update `apps/mobile/app/(tabs)/index.tsx` (Chat tab) — when offline, enqueue prompts instead of sending via WebSocket; show offline indicator banner                |           |      |
| TASK-039 | Update `apps/mobile/app/(tabs)/gallery.tsx` — show cached sessions when offline with stale-data indicator                                                           |           |      |
| TASK-040 | Update `apps/mobile/app/(tabs)/settings.tsx` — when offline, queue setting changes; show offline indicator                                                          |           |      |
| TASK-041 | Create `apps/mobile/components/OfflineBanner.tsx` — persistent banner component showing connectivity status                                                         |           |      |
| TASK-042 | Add `POST /api/sync/process` endpoint in `packages/api/src/routes/sync.ts` — batch processes queued actions from mobile (validates each, executes, returns results) |           |      |
| TASK-043 | Mount sync router in `packages/api/src/index.ts`                                                                                                                    |           |      |

### Implementation Phase 6: Agent Control from Mobile

- GOAL-006: Extend mobile app and WebSocket protocol to support agent lifecycle control

| Task     | Description                                                                                                                                                                                  | Completed | Date |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-044 | Add new WebSocket message types to `packages/shared/src/schema/message.ts`: `agent_start`, `agent_stop`, `agent_logs`, `agent_params`, `agent_status_update`                                 |           |      |
| TASK-045 | Update `apps/web/worker/bridge-agent.ts` — handle `agent_start`, `agent_stop`, `agent_params` messages from mobile; relay to CLI; broadcast `agent_status_update` and `agent_logs` to mobile |           |      |
| TASK-046 | Create `apps/mobile/components/AgentControls.tsx` — component with start/stop buttons, parameter editor, and log viewer                                                                      |           |      |
| TASK-047 | Update `apps/mobile/app/session/[id].tsx` — integrate AgentControls into session detail view, show real-time logs via FlatList                                                               |           |      |
| TASK-048 | Add `PATCH /api/sessions/:id/control` endpoint in `packages/api/src/routes/sessions.ts` — REST fallback for agent control (start/stop/params) that proxies to BridgeAgent                    |           |      |

### Implementation Phase 7: Agent Templates — Backend

- GOAL-007: Implement agent template CRUD, versioning, and instantiation API

| Task     | Description                                                                                                                                                                                                      | Completed | Date |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-049 | Create `packages/api/src/routes/agent-templates.ts` with full CRUD: `GET /` (list own + public), `POST /` (create), `GET /:id` (detail with versions), `PUT /:id` (update metadata), `DELETE /:id` (soft delete) |           |      |
| TASK-050 | Add template versioning endpoints: `POST /:id/versions` (create new version), `GET /:id/versions` (list versions), `GET /:id/versions/:versionId` (get specific version)                                         |           |      |
| TASK-051 | Add template instantiation endpoint: `POST /:id/instantiate` — creates an agent session from the latest (or specified) template version                                                                          |           |      |
| TASK-052 | Add template sharing endpoint: `PATCH /:id/share` — toggle `isPublic` flag                                                                                                                                       |           |      |
| TASK-053 | Add template duplication endpoint: `POST /:id/duplicate` — copies template + latest version to current user's account                                                                                            |           |      |
| TASK-054 | Implement permission checks: only owner can edit/delete/create versions; public templates are readable by all authenticated users; instantiation requires auth                                                   |           |      |
| TASK-055 | Mount agent-templates router in `packages/api/src/index.ts`                                                                                                                                                      |           |      |

### Implementation Phase 8: Agent Templates — Web Frontend

- GOAL-008: Build web UI for managing agent templates

| Task     | Description                                                                                                                                | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ---- |
| TASK-056 | Create `apps/web/app/templates/page.tsx` — template gallery with grid/list view, search, filter by tags, public/personal toggle            |           |      |
| TASK-057 | Create `apps/web/app/templates/new/page.tsx` — template creation form (name, description, tags, prompt template, model, tools, parameters) |           |      |
| TASK-058 | Create `apps/web/app/templates/[id]/page.tsx` — template detail view showing current config, version history, edit button                  |           |      |
| TASK-059 | Create `apps/web/app/templates/[id]/edit/page.tsx` — edit template metadata and create new version                                         |           |      |
| TASK-060 | Create `apps/web/app/components/TemplateCard.tsx` — reusable card component for template gallery                                           |           |      |
| TASK-061 | Create `apps/web/app/components/TemplateForm.tsx` — form component for create/edit with Zod validation                                     |           |      |
| TASK-062 | Create `apps/web/app/components/VersionHistory.tsx` — version list with diff view and rollback option                                      |           |      |
| TASK-063 | Update `apps/web/app/components/Nav.tsx` — add "Templates" navigation item                                                                 |           |      |
| TASK-064 | Create `apps/web/app/hooks/useTemplates.ts` — hook for template CRUD operations with React Query                                           |           |      |

### Implementation Phase 9: Agent Templates — Mobile Client

- GOAL-009: Build mobile UI for browsing and instantiating agent templates

| Task     | Description                                                                                                            | Completed | Date |
| -------- | ---------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-065 | Create `apps/mobile/hooks/useTemplates.ts` — hook for template listing, creation, and instantiation with offline cache |           |      |
| TASK-066 | Create `apps/mobile/app/templates/index.tsx` — template list screen (personal + public) with search                    |           |      |
| TASK-067 | Create `apps/mobile/app/templates/[id].tsx` — template detail with version info and "Launch Agent" button              |           |      |
| TASK-068 | Create `apps/mobile/app/templates/create.tsx` — template creation form adapted for mobile                              |           |      |
| TASK-069 | Update `apps/mobile/app/(tabs)/_layout.tsx` — add Templates tab or integrate into existing navigation                  |           |      |
| TASK-070 | Update `apps/mobile/app/(tabs)/gallery.tsx` — add "From Template" option when creating new sessions                    |           |      |

### Implementation Phase 10: Cross-Feature Integration & Polish

- GOAL-010: Wire up cross-feature interactions and finalize

| Task     | Description                                                                                                                             | Completed | Date |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-071 | Ensure push notifications include template name when agent was spawned from a template (update notification payload in bridge-agent.ts) |           |      |
| TASK-072 | Ensure offline queue handles template instantiation (queue `instantiate` action, replay on reconnect)                                   |           |      |
| TASK-073 | Ensure agent control from mobile works with template-spawned agents (session metadata includes templateVersionId)                       |           |      |
| TASK-074 | Add accessibility attributes to all new mobile components (accessibilityLabel, accessibilityRole, accessibilityHint)                    |           |      |
| TASK-075 | Add dark/light theme support for all new mobile components using existing NativeWind patterns                                           |           |      |
| TASK-076 | Run `bun run typecheck` and fix all type errors                                                                                         |           |      |
| TASK-077 | Run `bun run lint:fix` and resolve all lint issues                                                                                      |           |      |
| TASK-078 | Run `bun run build` to verify production build succeeds                                                                                 |           |      |

## 3. Alternatives

- **ALT-001**: Use Firebase SDK directly in React Native for push notifications — rejected because it adds heavy native dependency and conflicts with Expo Go compatibility approach
- **ALT-002**: Use WatermelonDB for offline sync — rejected as too complex for the queue-only scope; would be appropriate for full offline SQLite approach
- **ALT-003**: Extend the existing `agents` table for templates — rejected in favor of separate tables to maintain clean separation between CLI command definitions and user-created template configurations
- **ALT-004**: Use Web Crypto for biometric auth — rejected because biometric is inherently platform-specific; expo-local-authentication provides the necessary native bridge
- **ALT-005**: Use a WebSocket message for sync instead of REST — rejected because offline sync is inherently request/response (batch), not streaming

## 4. Dependencies

- **DEP-001**: `expo-notifications` ~0.31.x — push notification SDK for Expo (receives and handles push notifications)
- **DEP-002**: `expo-device` ~7.0.x — device info for push token registration (determines if physical device)
- **DEP-003**: `expo-local-authentication` ~16.0.x — biometric authentication API (Face ID, Touch ID, fingerprint)
- **DEP-004**: Firebase Service Account — JSON key file for FCM v1 API authentication (stored as Worker secret)
- **DEP-005**: Apple Push Notification Auth Key — .p8 key file for APNs JWT authentication (stored as Worker secret)
- **DEP-006**: `expo-network` ~7.0.x (already installed) — network state detection for offline mode

## 5. Files

### New Files

| File                                              | Description                                                      |
| ------------------------------------------------- | ---------------------------------------------------------------- |
| `packages/shared/src/schema/agent-template.ts`    | Zod schemas for agent templates, versions, instantiation         |
| `packages/shared/src/schema/notification.ts`      | Zod schemas for notification preferences and payloads            |
| `packages/shared/src/schema/offline-sync.ts`      | Zod schemas for offline sync queue                               |
| `packages/api/src/routes/agent-templates.ts`      | Hono router for agent template CRUD + versioning + instantiation |
| `packages/api/src/routes/notifications.ts`        | Hono router for notification preferences and test endpoint       |
| `packages/api/src/routes/sync.ts`                 | Hono router for offline sync batch processing                    |
| `packages/api/src/services/push-notifications.ts` | Push notification service (FCM + APNs integration)               |
| `apps/mobile/hooks/usePushNotifications.ts`       | Push notification registration and handling hook                 |
| `apps/mobile/hooks/useBiometric.ts`               | Biometric hardware check and authentication hook                 |
| `apps/mobile/hooks/useAppLock.ts`                 | App lock state management hook                                   |
| `apps/mobile/hooks/useNetworkStatus.ts`           | Real-time connectivity state hook                                |
| `apps/mobile/hooks/useOfflineSync.ts`             | Offline sync orchestrator hook                                   |
| `apps/mobile/hooks/useTemplates.ts`               | Template CRUD operations hook                                    |
| `apps/mobile/lib/notifications.ts`                | Notification handler setup                                       |
| `apps/mobile/lib/notification-channels.ts`        | Android notification channel setup                               |
| `apps/mobile/lib/offline-queue.ts`                | Offline action queue manager                                     |
| `apps/mobile/lib/offline-cache.ts`                | Simple read cache for offline mode                               |
| `apps/mobile/components/BiometricGate.tsx`        | Biometric authentication gate wrapper                            |
| `apps/mobile/components/AgentControls.tsx`        | Agent start/stop/logs/params UI                                  |
| `apps/mobile/components/OfflineBanner.tsx`        | Connectivity status banner                                       |
| `apps/mobile/app/templates/index.tsx`             | Template list screen                                             |
| `apps/mobile/app/templates/[id].tsx`              | Template detail screen                                           |
| `apps/mobile/app/templates/create.tsx`            | Template creation screen                                         |
| `apps/web/app/templates/page.tsx`                 | Web template gallery page                                        |
| `apps/web/app/templates/new/page.tsx`             | Web template creation page                                       |
| `apps/web/app/templates/[id]/page.tsx`            | Web template detail page                                         |
| `apps/web/app/templates/[id]/edit/page.tsx`       | Web template edit page                                           |
| `apps/web/app/components/TemplateCard.tsx`        | Template card component                                          |
| `apps/web/app/components/TemplateForm.tsx`        | Template create/edit form                                        |
| `apps/web/app/components/VersionHistory.tsx`      | Version history display                                          |
| `apps/web/app/hooks/useTemplates.ts`              | Web template management hook                                     |

### Modified Files

| File                                    | Changes                                                                                                                     |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared/src/index.ts`          | Add exports for `./schema/agent-template`, `./schema/notification`, `./schema/offline-sync`                                 |
| `packages/db/src/schema.ts`             | Add `agentTemplates`, `agentTemplateVersions`, `notificationPreferences`, `offlineSyncQueue` tables with relations          |
| `packages/api/src/index.ts`             | Mount `agentTemplatesRouter`, `notificationsRouter`, `syncRouter`                                                           |
| `packages/shared/src/schema/message.ts` | Add `agent_start`, `agent_stop`, `agent_logs`, `agent_params`, `agent_status_update` to wsMessageSchema discriminated union |
| `apps/web/worker/bridge-agent.ts`       | Handle new agent control messages, trigger push notifications on session status change                                      |
| `apps/web/wrangler.jsonc`               | Update Env interface types for new secrets (FCM, APNs)                                                                      |
| `apps/mobile/package.json`              | Add `expo-notifications`, `expo-device`, `expo-local-authentication`                                                        |
| `apps/mobile/app.json`                  | Add `expo-notifications` plugin config                                                                                      |
| `apps/mobile/app/_layout.tsx`           | Initialize push notifications, wrap with BiometricGate                                                                      |
| `apps/mobile/app/(tabs)/_layout.tsx`    | Add Templates tab (or adjust navigation)                                                                                    |
| `apps/mobile/app/(tabs)/index.tsx`      | Integrate offline queue for prompts, show OfflineBanner                                                                     |
| `apps/mobile/app/(tabs)/gallery.tsx`    | Show cached sessions when offline, add "From Template" option                                                               |
| `apps/mobile/app/(tabs)/settings.tsx`   | Wire notifications toggle, add biometric toggle, offline indicators                                                         |
| `apps/mobile/app/session/[id].tsx`      | Integrate AgentControls component for start/stop/logs/params                                                                |
| `apps/mobile/hooks/useAuth.ts`          | Store credentials in biometric-protected SecureStore                                                                        |
| `apps/web/app/components/Nav.tsx`       | Add "Templates" nav item                                                                                                    |
| `packages/api/src/routes/sessions.ts`   | Add `PATCH /:id/control` endpoint                                                                                           |

## 6. Testing

### Unit Tests

- **TEST-001**: Test `push-notifications.ts` service — mock FCM/APNs HTTP calls, verify payload formatting for both platforms, test error handling (invalid token, expired auth)
- **TEST-002**: Test `agent-template.ts` Zod schemas — valid/invalid template data, version increment logic, instantiation schema
- **TEST-003**: Test `offline-queue.ts` — enqueue/dequeue ordering, flush behavior, error handling for failed actions
- **TEST-004**: Test `agent-templates.ts` routes — CRUD operations, permission checks (owner vs other user vs public), versioning logic
- **TEST-005**: Test `sync.ts` route — batch processing, partial failure handling, result aggregation
- **TEST-006**: Test template instantiation — verify correct session creation from template config, metadata linking

### Integration Tests

- **TEST-007**: Test push notification end-to-end flow: session status change → bridge-agent triggers push → verify FCM/APNs payload sent
- **TEST-008**: Test offline queue → sync flow: enqueue actions offline, connect, verify batch processing on server
- **TEST-009**: Test template versioning: create template → add version → verify existing sessions still reference original version
- **TEST-010**: Test template sharing: toggle public → verify other users can read but not edit
- **TEST-011**: Test agent control WebSocket flow: mobile sends `agent_start` → bridge-agent relays to CLI → CLI responds with `agent_status_update`

### End-to-End Scenarios

- **TEST-012**: Full mobile flow: login → enable biometric → close app → reopen → biometric gate → navigate → receive push notification → tap notification → view session
- **TEST-013**: Full template flow: create template → add version → toggle public → other user discovers → instantiates → agent runs → push notification received
- **TEST-014**: Offline flow: go offline → send 3 prompts (queued) → go online → verify all 3 replayed and responses received
- **TEST-015**: Accessibility audit: run accessibility scanner on all new mobile screens, verify all interactive elements have labels and roles

## 7. Risks & Assumptions

### Risks

| Risk                                                  | Impact                                                                              | Likelihood | Mitigation                                                                                                                       |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| FCM v1 API rate limits on Cloudflare Worker egress    | Notifications delayed or dropped for high-volume users                              | Low        | Batch notifications per user (one notification summarizing multiple events), implement exponential backoff                       |
| APNs HTTP/2 connection management in Workers          | Workers have execution time limits; HTTP/2 persistent connections may not work      | Medium     | Use short-lived JWT tokens for APNs auth, keep payloads minimal, test connection behavior in Workers environment early (Phase 2) |
| expo-local-authentication not working on all devices  | Some Android devices lack biometric hardware                                        | Low        | Use `hasHardwareAsync()` and `isEnrolledAsync()` to gracefully degrade — hide toggle when unavailable                            |
| Offline queue conflicts on reconnect                  | Two devices queue same action, double-execution on sync                             | Medium     | Deduplicate by action ID on server side, implement idempotency keys in sync endpoint                                             |
| D1 schema migration adding 4 tables                   | Migration may fail if previous migrations have bugs (known issue in migration 0005) | Medium     | Fix migration 0005 column mismatch before generating new migration, test migration chain locally                                 |
| WebSocket protocol changes breaking CLI compatibility | Existing CLI clients won't understand new message types                             | Medium     | Make all new message types optional in BridgeAgent — ignore unknown types, add `supportedFeatures` handshake                     |
| Biometric bypass on jailbroken/rooted devices         | Security concern for sensitive data                                                 | Low        | Use `expo-local-authentication`'s built-in security checks; document that biometric is convenience layer, not security boundary  |

### Assumptions

- **ASSUMPTION-001**: Firebase project is already created or will be created for FCM — the Firebase service account key can be generated from Firebase Console
- **ASSUMPTION-002**: Apple Developer account exists for APNs auth key generation
- **ASSUMPTION-003**: The existing `device_tokens` table is sufficient for push token storage (verified — it has token, platform, userId)
- **ASSUMPTION-004**: The existing D1 database can handle the additional 4 tables (D1 limits are generous for this use case)
- **ASSUMPTION-005**: The CLI agent (on user's machine) will implement responses to new agent control messages (start/stop/logs/params) — this may require CLI package updates
- **ASSUMPTION-006**: Expo SDK 55 supports all three new packages (expo-notifications, expo-device, expo-local-authentication)

## 8. Cross-Feature Interactions

### Push Notifications + Agent Templates

- When an agent spawned from a template completes, the push notification payload includes the template name for context
- Notification deep link navigates to the session detail page which shows the template origin

### Offline Mode + Agent Templates

- Template instantiation is queued when offline and replayed on reconnect
- Template list is cached locally for offline browsing (read-only)
- Template creation/editing requires online state (not queued)

### Agent Control + Agent Templates

- Session metadata includes `templateVersionId` when spawned from a template
- Agent control (start/stop/params) works identically regardless of template origin
- Parameter adjustments from mobile can be persisted back to the template version (with user confirmation)

### Biometric Auth + All Features

- Biometric gate applies globally — all features require unlock
- Push notification tap triggers biometric gate before navigating
- Offline queue flush on reconnect happens behind biometric gate

## 9. Progressive Rollout Strategy

1. **Phase 1-2** (Backend schemas + Push): Deploy backend changes first — no client impact, existing clients continue working
2. **Phase 3** (Push client): Release behind feature flag in mobile app settings — users opt-in to push notifications
3. **Phase 4** (Biometric): Release as opt-in toggle in settings — no forced adoption
4. **Phase 5** (Offline): Release with degraded UX indication — offline banner shows limited functionality
5. **Phase 6** (Agent control): Requires CLI update coordination — release mobile first with graceful fallback if CLI doesn't support new messages
6. **Phase 7-9** (Templates): Web first, then mobile — template feature can be used via web while mobile catches up
7. **Phase 10** (Integration): Final polish and cross-feature wiring

## 10. Related Specifications / Further Reading

- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Expo Local Authentication Documentation](https://docs.expo.dev/versions/latest/sdk/local-authentication/)
- [FCM v1 HTTP API](https://firebase.google.com/docs/cloud-messaging/http-server-ref)
- [APNs HTTP/2 API](https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns)
- [Cloudflare Workers Durable Objects](https://developers.cloudflare.com/durable-objects/)
- Existing plan: `Plans/llm-provider-integration-plan.md` (related agent configuration)
- Existing plan: `Plans/agents-config-improvements.md` (related agent architecture)
