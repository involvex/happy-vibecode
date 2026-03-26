# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Quick-start commands

- Install dependencies (recommended):
  - bun install
- Start full development (monorepo):
  - bun run dev
- Start only the web app (local dev server + worker-compatible dev):
  - bun run dev:web
  - OR (package-scoped) bun run -F @happy-vibecode/web dev
- Build (monorepo):
  - bun run build
- Build only web app:
  - bun run build:web
  - OR (package-scoped) bun run -F @happy-vibecode/web build
- Deploy web worker (from apps/web):
  - bun run -F @happy-vibecode/web deploy
  - (this runs type generation, vite build, then wrangler deploy — see apps/web/package.json:9 -> apps/web/package.json:9)
- Lint / fix:
  - bun run lint
  - bun run lint:fix
- Format:
  - bun run format
- Typecheck:
  - bun run typecheck
- Tests:
  - bun run test (runs turbo run test across workspaces)
  - To run tests for a single package (if the package defines a test script):
    - bun run -F @happy-vibecode/<package> test
    - or use turbo filtering: turbo run test --filter=<package>

Why Bun + Turborepo

- This repo uses Bun as the package manager/runtime (root package.json shows packageManager: bun@1.3.10). See package.json:16 for workspace scripts and package.json:44 for the packageManager field (root package.json:16, package.json:44).
- Turborepo is used to orchestrate builds across workspaces. See turbo.json (build task dependencies): turbo.json:13.

High-level architecture (big picture)

- Monorepo layout
  - apps/ — deployable applications and edge code. apps/web is the primary web + Cloudflare Worker app.
  - packages/ — workspace packages shared across apps (api, db, shared, etc.). Example packages: packages/api, packages/db, packages/shared.
- App runtimes
  - Web app (apps/web): React (React 19), Next-style app running on Vite + vinext so it can run on Cloudflare Workers. Vite + cloudflare plugin enables `vite dev` to exercise the Worker runtime locally. See apps/web/README.md for the vinext + cloudflare explanation.
  - Cloudflare Worker: The worker entry is apps/web/worker/index.ts (configured in wrangler.jsonc). Wrangler's `main` points to ./worker/index.ts (apps/web/wrangler.jsonc:7).
  - Durable Objects and D1: The Worker uses Durable Objects (BridgeAgent / ChatAgent) and a D1 database. Migrations are stored in packages/db/drizzle and are referenced by wrangler.jsonc (apps/web/wrangler.jsonc:28 and packages/db/drizzle/0000_initial.sql:1).
- Package responsibilities (where to look first)
  - apps/web — UI + Worker entrypoint. Key UI file: apps/web/app/chat/Chat.tsx (chat frontend + bridge WS usage) — see apps/web/app/chat/Chat.tsx:109 for the WebSocket bridge URL construction.
  - apps/web/worker — Worker runtime code (Durable Objects, BridgeAgent, worker index). See apps/web/wrangler.jsonc:7 for main.
  - packages/api — server-side API logic and route bindings consumed by the Worker and web app. Entry: packages/api/src/index.ts (exports).
  - packages/db — database migrations and schema for D1 (packages/db/drizzle/\*). See packages/db/drizzle/0000_initial.sql:1 for the initial D1 migration.
  - packages/shared — shared types and schema used by both api and web.

Important files to consult (quick pointers)

- Root package.json (scripts, workspace config): package.json:16
- apps/web/package.json (web scripts, vite, wrangler): apps/web/package.json:6
- apps/web/wrangler.jsonc (worker bindings, D1 migrations dir, durable objects): apps/web/wrangler.jsonc:7 and apps/web/wrangler.jsonc:28
- Web UI chat implementation: apps/web/app/chat/Chat.tsx:109 (WebSocket bridge URL)
- Worker code entry and agents: apps/web/worker/index.ts and apps/web/worker/bridge-agent.ts (worker entry referenced in wrangler.jsonc:7)
- DB migrations: packages/db/drizzle/0000_initial.sql:1
- API package entry: packages/api/src/index.ts
- Turborepo tasks: turbo.json:13

Developer notes and gotchas

- Preferred package manager & runtime: Bun. Use bun install / bun run <script> rather than npm/pnpm unless you have a reason to switch. Root package.json declares packageManager: bun@1.3.10 (package.json:44).
- Local dev worker: `bun run dev:web` (root) or within apps/web `bun run dev` runs Vite with vinext + cloudflare plugin so server components and Worker bindings are available in dev. The README in apps/web documents the vinext setup and `vite dev` flow.
- D1 and KV bindings in wrangler.jsonc use placeholder IDs for local/dev. Before deploying to production replace `local` ids with real resources created via wrangler (see apps/web/wrangler.jsonc lines around migrations/kv/d1 entries). Migrations directory is packages/db/drizzle (apps/web/wrangler.jsonc:28).
- Durable Objects: The worker registers Durable Object classes (BridgeAgent / ChatAgent). Web UI expects a WebSocket bridge at path /agents/BridgeAgent/<roomId> (apps/web/app/chat/Chat.tsx:109).
- Type generation for wrangler: apps/web/package.json defines a `types` script that runs `wrangler types` — this is included in the `deploy` script (apps/web/package.json:15).

How to run a single package locally (examples)

- Run the web dev server only:
  - bun run dev:web
  - or: bun run -F @happy-vibecode/web dev
- Run only the api package typecheck (example):
  - bun run -F @happy-vibecode/api typecheck
- Run package-scoped build/test if available:
  - bun run -F @happy-vibecode/<package> <script>

Verification checklist (how I expect to validate changes)

- After bun install, run bun run dev:web and open <http://localhost:5173> — the chat UI should load and the Worker-compatible dev server should be accessible (apps/web README shows this flow).
- Verify Durable Object WebSocket path from the UI: apps/web/app/chat/Chat.tsx:109 shows the URL format used by the frontend.
- Build & deploy flow: bun run -F @happy-vibecode/web deploy (generates wrangler types, builds, and calls wrangler deploy).
- Run code checks: bun run format, bun run lint, bun run typecheck, and bun run test.

Notes for Claude Code instances

- When asked to make code changes, prefer editing existing files rather than adding new files unless necessary.
- Use the package-scoped scripts via `bun run -F <package>` when targeting a single workspace.
- For worker or Cloudflare-specific changes, always inspect apps/web/wrangler.jsonc first (bindings, migrations, main) and the worker entry apps/web/worker/index.ts (wrangler.jsonc:7).
- When referencing code in suggestions or PRs, include file_path:line_number so engineers can jump to the exact location (examples above).

If anything should be added or kept out of CLAUDE.md (CI deploy steps, contributor guidelines, or more detailed runbooks), tell me and I will update this file.
