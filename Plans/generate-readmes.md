# Plan: Generate Comprehensive README.md Files

## Summary

Create or update README.md files for all 6 packages/apps in the monorepo. The root README.md already exists and is adequate — no changes needed there.

## Targets

| #   | Path                        | Status          | Action                      |
| --- | --------------------------- | --------------- | --------------------------- |
| 1   | `apps/web/README.md`        | Exists (1 line) | Overwrite with full content |
| 2   | `apps/mobile/README.md`     | Missing         | Create                      |
| 3   | `packages/api/README.md`    | Missing         | Create                      |
| 4   | `packages/cli/README.md`    | Missing         | Create                      |
| 5   | `packages/db/README.md`     | Missing         | Create                      |
| 6   | `packages/shared/README.md` | Missing         | Create                      |

## README Structure (per file)

Each README will follow this structure (sections omitted if not applicable):

1. **Title & Badges** — H1 name + version/license badges
2. **Description** — 1-3 sentences on purpose and role in monorepo
3. **Table of Contents** — Linked navigation
4. **Getting Started** — Prerequisites, install, minimal usage
5. **Features** — Bullet list of capabilities
6. **API Reference / Usage** — Exports, routes, commands, components
7. **Configuration** — Env vars, config files, options tables
8. **Architecture** — Internal structure, design decisions
9. **Dependencies** — Internal (`@happy-vibecode/*`) and notable external deps
10. **Scripts** — npm/bun scripts table
11. **Examples** — Copy-paste-ready code examples
12. **Troubleshooting / FAQ** — Common issues and solutions
13. **Contributing** — Guidelines or link to root
14. **License** — Reference to repo license

## Content Sources

All content is derived from reading:

- `package.json` files (deps, scripts, exports, description)
- Source code (API surface, types, routes)
- Config files (`wrangler.jsonc`, `tsconfig.json`, `drizzle.config.ts`, etc.)
- `AGENTS.md` for monorepo conventions
- Existing root `README.md` for tone

## File-by-File Outline

### 1. `apps/web/README.md`

- Title: `@happy-vibecode/web`
- Description: Main web app — Next.js 16 on Cloudflare Workers via vinext, real-time agent control dashboard
- Features: BridgeAgent DO WebSocket relay, admin panel, auth, chat, billing
- Architecture: Worker routing (vinext + Hono API mount), D1/KV/DO bindings
- Key sections: Worker entry routing table, BridgeAgent DO, auth setup
- Dependencies: api, db, shared packages

### 2. `apps/mobile/README.md`

- Title: `@happy-vibecode/mobile`
- Description: Expo/React Native companion app
- Features: Tab navigation, chat, NativeWind styling, Better Auth
- Architecture: Expo Router, Metro shims, EAS Build profiles
- Getting Started: `bun install`, `bun run start`, EAS build commands

### 3. `packages/api/README.md`

- Title: `@happy-vibecode/api`
- Description: Hono REST API backend
- API Reference: Full route table from exploration
- Architecture: Route files, middleware (auth, admin), utils
- Dependencies: db, shared

### 4. `packages/cli/README.md`

- Title: `@happy-vibecode/cli`
- Description: CLI for remote agent control
- Commands: Full command table from exploration
- Getting Started: install globally or `bun run build`
- Supported agents: gemini, claude, codex, etc.

### 5. `packages/db/README.md`

- Title: `@happy-vibecode/db`
- Description: Drizzle ORM database layer for Cloudflare D1
- Schema: Table listing with descriptions
- Usage: `createDb()`, schema imports
- Migration workflow: generate → review → migrate

### 6. `packages/shared/README.md`

- Title: `@happy-vibecode/shared`
- Description: Shared types, Zod schemas, utilities
- Exports: Schema module breakdown (user, agent-session, message, etc.)
- Usage: Import examples for each module

## Execution Order

1. Write all 6 files in parallel (they are independent)
2. No lint/typecheck needed — these are documentation files

## Verification

- Confirm each file exists and has correct content
- Verify no broken internal links
- Ensure consistent formatting across all READMEs
