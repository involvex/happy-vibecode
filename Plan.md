## Plan: Evolve Monorepo for Remote LLM Agent Platform

**TL;DR:**  
Transform the current Bun/TypeScript monorepo into a scalable, production-ready platform (web/mobile) for remote interaction with multiple LLM agents (gemini-cli, claude code, copilot, antigravity, opencode). Leverage TurboRepo, Vinext, Kumo, and Cloudflare D1, with all deployments on Cloudflare Workers’ free tier.

---

### 1. Project Overview & Goals

- **Purpose:**  
  Enable users to securely interact with their own LLM agents (across desktop and mobile) from anywhere, inspired by the "happy" project’s remote control and seamless handoff UX.
- **Key Value:**  
  - Unified remote access to multiple LLM agents  
  - End-to-end encrypted sessions  
  - Device handoff, notifications, and session persistence  
  - 100% open source, privacy-first, and free to use

---

### 2. Monorepo Structure & Evolution Plan

**A. TurboRepo Formalization**

- Ensure `turbo.json` is present and configured for all apps/packages.
- Use Bun as the default runtime for all scripts and builds.
- Standardize scripts: `dev`, `build`, `typecheck`, `lint`, `test` at root and per package.

**B. Recommended Layout**

```
apps/
  web/      # Vinext web app
  mobile/   # mobile app (PWA or React Native)
packages/
  api/      # API routes, Kumo edge functions, agent proxy logic
  shared/   # Types, schemas, utilities, auth logic
  db/       # D1 schema, migration scripts, DB access layer
  agents/   # (optional) Agent-specific adapters/wrappers
```

- Add `db/` for D1 schema and access logic.
- Optionally add `agents/` for modular LLM agent integrations.

**C. Shared Code Strategy**

- All types, Zod schemas, and utility functions in `packages/shared`.
- API contracts and DB access logic in `packages/api` and `packages/db`.
- Use path aliases (`@shared`, `@api`, etc.) for clean imports.

---

### 3. Core Features & User Flow

**A. Main Functionalities**

- User authentication (email, OAuth, or device-based)
- Agent registration (connect gemini-cli, claude code, etc.)
- Remote session management (start, stop, switch device)
- Real-time message exchange (send/receive, streaming if possible)
- Session history and message logs
- Push notifications (web/mobile)
- Secure credential storage and E2E encryption

**B. High-Level User Flow**

1. User signs in (web/mobile)
2. Registers/connects their LLM agent(s)
3. Starts a remote session (web/mobile UI)
4. Sends prompts, receives responses in real time
5. Switches between devices seamlessly
6. Views session/message history, receives notifications

---

### 4. Technical Architecture & Integration

**A. Stack Integration**

- **Bun:** Fast runtime for all scripts, builds, and local dev.
- **TypeScript:** Strict typing repo-wide.
- **Vinext:**  
  - Web: Vinext SSR app, based on a clean example (remove all AI chat demo code).
  - Mobile: Expo, Ionic or React Native (reuse as much as possible from web).
- **Kumo:**  
  - Edge/serverless functions for API endpoints, agent proxying, and auth.
- **Cloudflare D1:**  
  - Serverless SQL for users, sessions, messages, agent configs.

**B. API Design**

- REST/JSON endpoints for all client-server interactions.
- Kumo functions handle:
  - User auth/session
  - Agent registration and proxying (per agent type)
  - Message relay (web/mobile <-> agent)
  - Session and message history CRUD
- Use `packages/api` for route definitions and handler logic.

**C. LLM Agent Integration**

- Each agent (gemini-cli, claude code, etc.) gets a proxy adapter in `packages/agents` or `api`.
- Securely store agent credentials (never expose to client).
- Use environment variables/secrets for agent API keys.
- Support local agent connections (via WebSocket, HTTP, or CLI bridge) and remote APIs.

---

### 5. Database Design Considerations (Cloudflare D1)

**A. Key Entities**

- `users`: id, email, auth info, created_at
- `agents`: id, user_id, type, config, status, created_at
- `sessions`: id, user_id, agent_id, status, started_at, ended_at
- `messages`: id, session_id, sender (user/agent), content, timestamp

**B. Relationships**

- One user → many agents
- One agent → many sessions
- One session → many messages

**C. Schema Suggestions**

- Use D1’s recommended patterns for foreign keys and indexing.
- Store minimal PII; prefer device-based auth if possible.
- Use migration scripts in `packages/db` for schema evolution.

---

### 6. Deployment & CI/CD Strategy (Free Tier Focused)

**A. Deployment Steps**

1. **Web App:**  
   - Deploy Vinext SSR app to Cloudflare Pages/Workers.
   - Set up custom domain: `happy-vibecode.involvex.workers.dev`
2. **API/Kumo Functions:**  
   - Deploy all API endpoints and agent proxies as Workers (via Kumo).
   - Use wrangler for deployment scripts.
3. **Mobile App:**  
   - If PWA: deploy alongside web app.
   - If React Native: distribute via Expo Go/TestFlight/Play Store (no backend deployment needed).
4. **Database:**  
   - Provision D1 instance via Cloudflare dashboard.
   - Run migrations on deploy.

**B. CI/CD Pipeline**

- Use GitHub Actions (free) for:
  - Lint, typecheck, test on PRs
  - Build and deploy web/app/api to Cloudflare on main branch push
  - Run DB migrations as part of deploy
- Use wrangler and turbo scripts for build/deploy orchestration.

---

### 7. Key Milestones & Estimated Timeline

**Phase 1: Monorepo Foundation (1 week)**

- TurboRepo config, Bun setup, clean Vinext example, remove AI chat demo

**Phase 2: Core API & DB (1-2 weeks)**

- D1 schema, API endpoints, Kumo integration, user/session/message models

**Phase 3: Agent Integration (2-3 weeks)**

- Proxy adapters for each LLM agent, secure credential handling, agent registration UI

**Phase 4: Web/Mobile UI (2-3 weeks)**

- Auth, session management, message UI, device handoff, notifications

**Phase 5: Deployment & CI/CD (1 week)**

- Cloudflare deploys, domain config, CI/CD pipeline, docs

**Phase 6: Testing & Polish (1 week)**

- E2E tests, bugfixes, UX polish, accessibility

---

### 8. Potential Challenges & Mitigation Strategies

- **LLM Agent API Rate Limits:**  
  - Solution: Queue requests, show user feedback, allow agent-specific error handling.
- **Cloudflare D1 Limitations:**  
  - Solution: Optimize queries, batch writes, monitor usage, plan for sharding if needed.
- **Free Tier Constraints:**  
  - Solution: Minimize cold starts, use static assets, avoid heavy compute, monitor quotas.
- **Mobile Deployment:**  
  - Solution: Prefer PWA for simplicity; if native, use Expo for easy distribution.
- **Credential Security:**  
  - Solution: Never store agent keys on client; use Cloudflare Secrets and server-side proxying.
- **Agent Integration Diversity:**  
  - Solution: Abstract agent interface, modular adapters, document integration points.

---

**Relevant files**

- `package.json`, `turbo.json`, `tsconfig.json` — Monorepo config, scripts, type safety
- `apps/web/`, `apps/mobile/` — Vinext apps, UI, device handoff logic
- `packages/api/` — API routes, Kumo handlers, agent proxy logic
- `packages/shared/` — Types, schemas, utilities
- `packages/db/` — D1 schema, migrations, DB access
- `wrangler.jsonc` — Cloudflare Workers/Kumo config

---

**Verification**

1. All apps/packages build and typecheck with Bun/Turbo
2. Web/mobile UI loads, no AI chat demo code remains
3. API endpoints proxy to all supported LLM agents
4. D1 DB schema matches entity model, migrations run cleanly
5. Deployments succeed to `happy-vibecode.involvex.workers.dev`
6. End-to-end test: user can register, connect agent, start session, send/receive messages, switch devices

---

**Decisions**

- All deployments on Cloudflare free tier, no paid services
- Vinext for both web and mobile (PWA preferred for mobile)
- Modular agent integration for future extensibility
- D1 as the only database, with serverless-first schema

---

**Further Considerations**

1. **Auth:** Device-based or OAuth? Device-based is simpler for MVP, OAuth for future.
2. **Agent Connection:** Support both local (CLI bridge) and remote (API) agents for flexibility.
3. **Notifications:** Web push for browser, fallback to polling for mobile if needed.

---

This plan provides a clear, actionable roadmap for evolving the repo into a robust, scalable monorepo platform for remote LLM agent interaction.

### Design

## Mobile

## Stitch Instructions

Get the images and code for the following Stitch project's screens:

## Project

ID: 17134232173258000288

## Screens

1. Design System
    ID: asset-stub-assets-62b38aefedcb45cea5f3eb64a092e764-1774505879932

2. Agent Gallery
    ID: 286e1f243d8b4d7c917338c21c130eef

3. Active Session
    ID: b5dab28f219d4c33b934caf84e272cc7

4. Settings
    ID: 7bd76c2d7f9a497bbb6e35dd4ecd8473

5. History
    ID: 8e9f98d99d114699a799130ae2b584ed

6. Agent Configuration
    ID: e7509be413fd4fc1b1da1b899652eae9

Use a utility like `curl -L` to download the hosted URLs.

## Web

## Stitch Instructions

Get the images and code for the following Stitch project's screens:

## Project

ID: 16170134109792201713

## Screens

1. Settings & Credentials
    ID: 3b5a352e78a242afa9739df09b012fc5

2. Chat Interface
    ID: faa53c13d31e4b68836ba9b267bb1c99

3. System Settings
    ID: 826341600fec4f48bec003a1fe06c6da

4. Design System
    ID: asset-stub-assets-8ba2f86b6622471aae13e74e1cd6e789-1774506108293

5. Dashboard
    ID: 3df9f85b541b41a8874c37e4985131f1

6. Authentication
    ID: 09bb25dd83d9408fb52f112524713946

7. Happy Landing Page
    ID: 8c9865ea61924829b21023b148dec78f

8. Project Plan (plan.md)
    ID: 93b895a641bc4ae88f56af17ca8a6c1d

Use a utility like `curl -L` to download the hosted URLs.
