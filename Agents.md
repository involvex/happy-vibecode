# Agents.md

Guide for AI agents working in this repository. Follow progressive loading: start with this file, then explore package READMEs and skills as needed.

## What is Happy Vibecode?

Monorepo for Happy Vibecode - a platform for running AI coding agents with remote control via web/phone. Built on Cloudflare Workers with vinext, Agents SDK, and modern React.

## Repository Structure

```
happy-vibecode/
├── apps/
│   └── web/              # Main web application (Next.js on vinext)
├── packages/
│   ├── api/              # Hono API routes
│   ├── db/               # Drizzle ORM schemas
│   └── shared/           # Shared types and Zod schemas
├── .agents/
│   └── skills/           # Agent skills for various tasks
└── Plans/                # Project planning documents
```

## Technologies

- **Runtime**: Bun 1.3.x (package manager)
- **Frontend**: React 19, Next.js 16 (via vinext), Tailwind CSS v4
- **Backend**: Cloudflare Workers, Hono, vinext
- **AI**: Agents SDK, Workers AI, AI Chat SDK
- **Database**: D1 (SQLite), Drizzle ORM
- **Storage**: Cloudflare KV, Durable Objects
- **Deployment**: Wrangler, Cloudflare Pages/Workers
- **Testing**: Vitest (via turbo)
- **Linting**: oxlint, Prettier

## Useful Commands

### Development

```bash
# Install dependencies
bun install

# Run all packages in development mode
bun run dev

# Run web app only
bun run dev:web

# Run type checking across all packages
bun run typecheck
```

### Building

```bash
# Build all packages
bun run build

# Build web app only
bun run build:web
```

### Testing & Linting

```bash
# Run tests across all packages
bun run test

# Format code
bun run format

# Lint and fix
bun run lint:fix
```

### Deployment

```bash
# Deploy web app to Cloudflare
bun run -F @happy-vibecode/web deploy

# Generate wrangler types
bun run -F @happy-vibecode/web types
```

### Database

```bash
# Generate Drizzle migrations
bun run -F @happy-vibecode/db generate

# Run Drizzle migrations
bun run -F @happy-vibecode/db migrate
```

## Best Practices

### Code Standards

- **TypeScript**: Strict mode enabled. Always use proper types - no `any` or untyped code.
- **Formatting**: Use Prettier with `@involvex/prettier-config`. Run `bun run format` before committing.
- **Linting**: Run `bun run lint:fix` to auto-fix issues. Follow oxlint rules.
- **Path Aliases**: Use `@happy-vibecode/*` for workspace packages.

### Architecture Patterns

- **API Routes**: Define in `packages/api/src/routes/` using Hono. Mount at `/api/*` in worker.
- **Database**: Use Drizzle ORM. Schemas in `packages/db/src/schema.ts`. Migrations in `packages/db/drizzle/`.
- **Shared Types**: Define types and Zod schemas in `packages/shared/src/`.
- **Durable Objects**: Define in `apps/web/worker/` with proper state management.

### Cloudflare Workers

- **Worker Entry**: `apps/web/worker/index.ts` - handles routing, image optimization, and API mounting.
- **Durable Objects**: Extend `Agent` class from `agents` SDK. Use `@callable()` for RPC methods.
- **State Management**: Use `setState()` with type-safe state objects. Implement `validateStateChange` for validation.
- **WebSocket**: Use `routeAgentRequest` for agent routing. Implement `onConnect`/`onMessage` hooks.

### React & Frontend

- **Routing**: TanStack Router via vinext. Define routes in `apps/web/app/`.
- **Styling**: Tailwind CSS v4 with CSS variables. Use `@theme` for custom tokens.
- **Data Fetching**: Use React Query patterns or vinext loaders.
- **AI Integration**: Use `useAgent` and `useAgentChat` hooks from AI Chat SDK.

### Error Handling

- Always handle async operations with proper try/catch blocks.
- Use Zod for runtime validation of external data.
- Implement proper error boundaries in React components.
- Log errors with appropriate context for debugging.

### Performance

- Minimize bundle size - use dynamic imports for heavy modules.
- Leverage Cloudflare's edge caching for static assets.
- Use Workers AI efficiently - batch requests when possible.
- Implement proper loading states for async operations.

## Available Skills

The `.agents/skills/` directory contains specialized skills for various tasks:

| Skill                             | Purpose                            |
| --------------------------------- | ---------------------------------- |
| `agents-sdk`                      | Building AI agents with Agents SDK |
| `cloudflare`                      | Cloudflare Workers development     |
| `workers-best-practices`          | Production Workers patterns        |
| `wrangler`                        | Wrangler CLI and configuration     |
| `durable-objects`                 | Durable Objects development        |
| `vinext`                          | Next.js on Cloudflare Workers      |
| `building-ai-agent-on-cloudflare` | AI agent patterns                  |
| `create-implementation-plan`      | Planning new features              |
| `writing-plans`                   | Task planning workflows            |

## Critical Guidelines

1. **Fix root cause** - Never apply band-aid solutions. Identify and fix the underlying issue.
2. **Verify knowledge** - When working with Cloudflare products, prefer retrieving current docs over pre-trained knowledge.
3. **Ask when stuck** - If unsure after reading code, ask user with specific options.
4. **Handle conflicts** - If you encounter conflicting information or unexpected changes, stop and clarify with user.
5. **Respect existing patterns** - Follow the established code style and architecture in each package.
6. **Test changes** - Always run typecheck and lint before considering work complete.

## Key Files Reference

| Task                  | Key Files                                                         |
| --------------------- | ----------------------------------------------------------------- |
| Add API endpoint      | `packages/api/src/routes/`, mount in `apps/web/worker/index.ts`   |
| Add database schema   | `packages/db/src/schema.ts`, migrations in `packages/db/drizzle/` |
| Add shared type       | `packages/shared/src/`, export in `packages/shared/src/index.ts`  |
| Modify worker routing | `apps/web/worker/index.ts`                                        |
| Add Durable Object    | `apps/web/worker/`, register in `wrangler.jsonc`                  |
| Add frontend route    | `apps/web/app/`, use TanStack Router                              |
| Add styling           | `apps/web/app/globals.css`, Tailwind config                       |

## Database Migrations

When making schema changes:

1. Modify `packages/db/src/schema.ts`
2. Run `bun run -F @happy-vibecode/db generate` to create migration
3. Review migration file in `packages/db/drizzle/`
4. Run `bun run -F @happy-vibecode/db migrate` to apply locally
5. Update `wrangler.jsonc` if adding new bindings
