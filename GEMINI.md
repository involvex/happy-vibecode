# GEMINI.md

This file provides instructional context for the Gemini CLI when working with the `happy-vibecode` monorepo. It supplements `CLAUDE.md` and `Agents.md` with project-specific memories and operational mandates.

## Project Overview

`happy-vibecode` is a monorepo platform for running AI coding agents with remote control. It is built using a modern stack centered on Cloudflare Workers and the Agents SDK.

- **Frontend**: React 19, Next.js 16 (via vinext), Tailwind CSS v4.
- **Backend**: Cloudflare Workers, Hono, Durable Objects.
- **AI**: Agents SDK, Workers AI.
- **Data**: D1 (SQLite) with Drizzle ORM, KV.
- **Package Manager**: Bun 1.3.x.

## Building and Running

### Core Commands

- **Install**: `bun install`
- **Full Dev**: `bun run dev` (orchestrated by Turborepo)
- **Web App Dev**: `bun run dev:web` (Vite + vinext + Cloudflare)
- **Build All**: `bun run build`
- **Test All**: `bun run test`
- **Lint All**: `bun run lint:fix`
- **Typecheck All**: `bun run typecheck`

### Package-Specific Scripts

Always prefer using the `-F` flag to run scripts within a specific workspace:

- `bun run -F @happy-vibecode/web <script>`
- `bun run -F @happy-vibecode/api <script>`
- `bun run -F @happy-vibecode/db <script>`

## Development Conventions

### Code Style & Standards

- **TypeScript**: Strict mode is mandatory. Avoid `any`. Use project-specific types from `@happy-vibecode/shared`.
- **Formatting**: Run `bun run format` (Prettier) before every commit.
- **Linting**: Follow `oxlint` rules. Use `bun run lint:fix` to address issues automatically.
- **Imports**: Use `@happy-vibecode/*` aliases for cross-package dependencies.

### Architecture Patterns

- **API Routes**: Hono routes in `packages/api/src/routes/`, mounted in `apps/web/worker/index.ts`.
- **Database**: Drizzle schemas in `packages/db/src/schema.ts`. Migrations in `packages/db/drizzle/`.
- **Durable Objects**: Extend `Agent` from `agents` SDK. Use `@callable()` for RPC.
- **State**: Use `setState()` for agent state management with proper validation.

## Key Files Map

| Package        | Path              | Responsibility                             |
| -------------- | ----------------- | ------------------------------------------ |
| **Web App**    | `apps/web`        | UI + Worker entrypoint (`worker/index.ts`) |
| **Mobile App** | `apps/mobile`     | Expo/React Native app                      |
| **API**        | `packages/api`    | Server-side Hono logic                     |
| **Database**   | `packages/db`     | Drizzle schema and migrations              |
| **Shared**     | `packages/shared` | Shared types and Zod schemas               |

## Critical Instructions for Gemini CLI

1.  **Always Verify**: Run `bun run typecheck`, `bun run lint:fix`, and `bun run format` after any code change.
2.  **Surgical Edits**: Target changes precisely. Do not refactor unrelated code.
3.  **No Reverts**: Do not revert changes unless they cause an error or specifically requested.
4.  **No Apologies**: Be direct and concise. Focus on the task.
5.  **D1 Migrations**: When changing the schema, run `bun run -F @happy-vibecode/db generate` and verify the migration.
6.  **Wrangler Types**: Run `bun run -F @happy-vibecode/web types` when Cloudflare bindings change.
7.  **Vite Dev**: Use `vite dev` via `bun run dev:web` to get full access to Cloudflare bindings locally.
