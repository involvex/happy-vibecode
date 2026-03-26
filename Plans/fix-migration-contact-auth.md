---
goal: Fix migration error, contact page button, and enhance auth system
version: 1.0
date_created: 2026-03-26
last_updated: 2026-03-26
status: 'Planned'
tags: ['bug', 'feature', 'migration']
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Three issues to address:

1. **Migration 0005 fails** — `agent_sessions_new` has 10 columns but `SELECT *` from old table returns 8
2. **Contact page submit button never unlocks** — Turnstile token stays empty, keeping submit disabled
3. **Enhance existing auth** — Add password-based login/register, improve session handling for web and mobile

## 1. Requirements & Constraints

- **REQ-001**: Fix the SQL migration to explicitly list columns in INSERT ... SELECT
- **REQ-002**: Fix Turnstile integration so the submit button unlocks when widget completes (or fails gracefully)
- **REQ-003**: Add password-based authentication to the existing auth system
- **REQ-004**: Enhance web login page with password login option
- **REQ-005**: Keep existing GitHub OAuth working
- **SEC-001**: Passwords must be hashed (bcrypt/argon2) before storage
- **CON-001**: Auth must work on Cloudflare Workers (no Node.js-specific APIs)
- **CON-002**: Mobile app uses expo-secure-store for credential storage
- **GUD-001**: Follow existing patterns from `packages/api/src/routes/auth.ts`

## 2. Implementation Steps

### Implementation Phase 1: Fix Migration 0005

- GOAL-001: Fix the column count mismatch in the agent_sessions table migration

| Task     | Description                                                                                                                                                                                                                                                                                                                                          | Completed | Date |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-001 | Fix `packages/db/drizzle/0005_agents_table.sql`: replace `INSERT INTO agent_sessions_new SELECT * FROM agent_sessions` with explicit column list mapping the 8 old columns to the 8 non-auto columns in the new table (id, user_id, agent_type, connection_status, room_id, started_at, ended_at, metadata). workspace_id and model default to NULL. |           |      |

### Implementation Phase 2: Fix Contact Page Submit Button

- GOAL-002: Make the Turnstile widget properly unlock the submit button, with graceful fallback

| Task     | Description                                                                                                                                                                                                                            | Completed | Date |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-002 | In `apps/web/app/contact/page.tsx`, fix the Turnstile effect: add `onerror` callback to script element for load failure detection, add a 10-second timeout that sets turnstileToken to a sentinel value if widget never fires callback |           |      |
| TASK-003 | In `apps/web/app/contact/page.tsx`, change the submit button `disabled` condition: allow submission without turnstile token (remove `!turnstileToken` from disabled check)                                                             |           |      |
| TASK-004 | In `packages/api/src/routes/tickets.ts`, make turnstile verification optional: skip verification if `turnstileToken` is empty or matches a sentinel value, so the API still works when Turnstile fails                                 |           |      |

### Implementation Phase 3: Enhance Auth — Password Login

- GOAL-003: Add password-based registration and login

| Task     | Description                                                                                                                                                                                                                                             | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-005 | In `packages/api/src/routes/auth.ts`, add `/login` endpoint: accepts `{email, password}`, verifies password hash against `password_hash` column, returns `{id, apiToken}` on success                                                                    |           |      |
| TASK-006 | In `packages/api/src/routes/auth.ts`, update `/register` endpoint: hash password with Web Crypto API (PBKDF2 or similar Workers-compatible approach) if provided, store in `password_hash` column                                                       |           |      |
| TASK-007 | Create `packages/api/src/utils/password.ts`: implement `hashPassword(password: string)` and `verifyPassword(password: string, hash: string)` using Web Crypto API (PBKDF2 with SHA-256, 100k iterations, random salt). Must work on Cloudflare Workers. |           |      |

### Implementation Phase 4: Enhance Web Login Page

- GOAL-004: Update the web login page to support password-based login

| Task     | Description                                                                                                                                                                                        | Completed | Date |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-008 | In `apps/web/app/login/page.tsx`, update the register form to include optional password field: if user enters password, send it to register endpoint; if not, fall back to token-only registration |           |      |
| TASK-009 | In `apps/web/app/login/page.tsx`, update the login form: add email+password login option alongside the existing token login. Add a toggle between "Login with Token" and "Login with Password"     |           |      |

### Implementation Phase 5: Enhance Auth — Mobile

- GOAL-005: Add password-based login to mobile app

| Task     | Description                                                                                                                                                                                               | Completed | Date |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-010 | In `apps/mobile/app/(tabs)/settings.tsx`, add password login option: add email and password fields, call the new `/api/auth/login` endpoint, store returned token+userId via existing `useAuth().login()` |           |      |

## 3. Alternatives

- **ALT-001**: Use next-auth (Auth.js) — rejected because it requires Node.js runtime and significant refactoring incompatible with Cloudflare Workers
- **ALT-002**: Use bcrypt for password hashing — rejected because bcrypt requires native Node.js `crypto` module; PBKDF2 via Web Crypto API works on Workers
- **ALT-003**: Remove Turnstile entirely from ticket creation — rejected because it provides bot protection; making it optional-with-fallback is better

## 4. Dependencies

- **DEP-001**: Web Crypto API (available on Cloudflare Workers natively)
- **DEP-002**: No new npm packages required

## 5. Files

- **FILE-001**: `packages/db/drizzle/0005_agents_table.sql` — fix migration INSERT
- **FILE-002**: `apps/web/app/contact/page.tsx` — fix Turnstile + submit button
- **FILE-003**: `packages/api/src/routes/tickets.ts` — make Turnstile optional
- **FILE-004**: `packages/api/src/utils/password.ts` — new file for password hashing
- **FILE-005**: `packages/api/src/routes/auth.ts` — add login endpoint, update register
- **FILE-006**: `apps/web/app/login/page.tsx` — add password login UI
- **FILE-007**: `apps/mobile/app/(tabs)/settings.tsx` — add password login to mobile

## 6. Testing

- **TEST-001**: Apply migration 0005 to local D1 and verify agent_sessions table has correct schema with data preserved
- **TEST-002**: Open contact page, verify submit button unlocks when Turnstile widget completes (or after timeout fallback)
- **TEST-003**: Register with password via API, verify password_hash is stored
- **TEST-004**: Login with email+password via API, verify correct apiToken returned
- **TEST-005**: Run `bun run typecheck && bun run lint:fix && bun run build:web`

## 7. Risks & Assumptions

- **RISK-001**: PBKDF2 with 100k iterations adds ~100ms latency per login on Workers — acceptable for auth
- **RISK-002**: Making Turnstile optional could allow bot submissions — mitigated by auth requirement (only logged-in users can submit tickets)
- **ASSUMPTION-001**: The `password_hash` column already exists in the users table schema but may not exist in the actual D1 database (created in schema but never migrated)
- **ASSUMPTION-002**: Turnstile test key `1x00000000000000000000AA` only works on localhost; production needs a real key

## 8. Related Specifications / Further Reading

- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Cloudflare Workers Web Crypto](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/)
- [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/)
