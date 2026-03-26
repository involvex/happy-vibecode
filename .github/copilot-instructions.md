# Copilot instructions for this repository

Purpose

This file gives Copilot CLI/VS Code Copilot quick, repository-specific guidance: how to run builds/tests/lints (including single-test examples), a short high-level architecture summary, and conventions unique to this monorepo.

Quick commands (root)

- Install dependencies (preferred):
  - bun install

- Run development (all packages):
  - bun run dev

- Run web app dev (includes Worker-compatible dev with vinext + Cloudflare plugin):
  - bun run dev:web
  - or package-scoped: bun run -F @happy-vibecode/web dev

- Build (monorepo):
  - bun run build
  - build web only: bun run build:web

- Deploy web Worker (apps/web):
  - bun run -F @happy-vibecode/web deploy
  - This runs `bun run -F @happy-vibecode/web types` then vite build and `wrangler deploy`.

- Generate Wrangler types (apps/web):
  - bun run -F @happy-vibecode/web types

- Formatting / lint / typecheck / tests:
  - Format: bun run format
  - Lint (monorepo): bun run lint
  - Lint and auto-fix: bun run lint:fix
  - Typecheck: bun run typecheck
  - Run tests (monorepo): bun run test # uses turbo across workspaces

Package-scoped commands

- Run a script for a single workspace package:
  - bun run -F @happy-vibecode/<package> <script>
  - Example: bun run -F @happy-vibecode/db migrate

- Run turbo for a single package task (filtering):
  - turbo run test --filter=@happy-vibecode/web

How to run a single test (examples)

- If the package exposes a `test` script:
  - bun run -F @happy-vibecode/<package> test -- <path/to/test.spec.ts>

- Direct Vitest (when present):
  - npx vitest run path/to/test.spec.ts
  - npx vitest run --testNamePattern "My test name"

- Turbo-filtered single-package test run:
  - turbo run test --filter=@happy-vibecode/<package>

High-level architecture (short)

- Monorepo layout:
  - `apps/` — deployable applications and edge code. `apps/web` is a Next-style app on Vite (vinext) and the Cloudflare Worker entrypoint.
  - `packages/` — shared workspace packages (e.g., `api`, `db`, `shared`).

- Runtimes and patterns:
  - Package manager / runtime: Bun (root package.json: `packageManager: bun@1.3.10`). Prefer `bun` commands for local workflows.
  - Web app: React (React 19) + vinext (Next-on-Vite). Vite + Cloudflare plugin runs an almost-production Worker runtime locally (`vite dev`).
  - Worker entry: `apps/web/worker/index.ts` — routes agent requests (routeAgentRequest), handles image optimization and delegates to vinext's RSC handler.
  - Durable Objects: ChatAgent / BridgeAgent live under `apps/web/worker/` and persist chat state (DO SQLite). Frontend expects WebSocket bridge at `/agents/BridgeAgent/<roomId>`.
  - Database: D1 (SQLite) + Drizzle ORM (migrations in `packages/db/drizzle/`).

Key repo conventions and gotchas

- Use package-scoped scripts: `bun run -F @happy-vibecode/<package> <script>` for targeted tasks.
- Turborepo orchestration: prefer `turbo run <task>` for cross-workspace workflows (root scripts proxy to turbo).
- Worker dev: `bun run dev:web` runs vinext + Cloudflare plugin to exercise Workers runtime locally (Durable Objects, D1, KV bindings).
- Wrangler types: run `bun run -F @happy-vibecode/web types` before deploying — `deploy` script already runs it.
- Database migrations: `packages/db/drizzle/` holds generated migrations; use `bun run -F @happy-vibecode/db generate` and `bun run -F @happy-vibecode/db migrate` to manage them.
- Durable Object websocket path: `/agents/BridgeAgent/<roomId>` (see `apps/web/app/chat/Chat.tsx`).
- Prefer editing existing package files rather than adding new top-level services unless required.

Important files (quick pointers)

- Root scripts & workspace config: `package.json`
- Web app README & vinext notes: `apps/web/README.md`
- Worker entry and agents: `apps/web/worker/index.ts`, `apps/web/worker/bridge-agent.ts`
- Wrangler config & bindings: `apps/web/wrangler.jsonc`
- DB schema & migrations: `packages/db/src/schema.ts`, `packages/db/drizzle/`
- Shared types & Zod schemas: `packages/shared/src/`
- Agent skills and AI guidance: `.agents/skills/` and `Agents.md`

MCP servers (configured)

This project is configured to point to Cloudflare Observability MCP for build/observability workflows. Local example file is included at `.github/copilot-mcp-servers.json`.

- Cloudflare Observability MCP:
  - URL: https://observability.mcp.cloudflare.com/mcp
  - Purpose: optional remote MCP for Cloudflare build/observability tooling used by agents and developer tools.

Notes for Copilot sessions

- When asked to modify Workers/Cloudflare-related code, consult `apps/web/wrangler.jsonc` and `apps/web/worker/index.ts` first (bindings, migrations, main entry).
- Use package-scoped commands when testing or building a single package. Provide file:line references in PRs and Copilot prompts to speed navigation.
- For tasks requiring environment bindings (D1, KV, DO), verify `wrangler.jsonc` and local `.env` before deploying.

If changes are proposed to this file

- Prefer small, surgical changes. Keep commands up-to-date with scripts in `package.json` and `apps/web/package.json`.

---

If you want this file to include additional examples (CI snippets, or VS Code launch configurations), say which area to prioritize and it will be added.
