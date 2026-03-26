# Implementation Plan: Responsive Nav, User Roles, Contact/Tickets, Turnstile

## Overview

Four interconnected features: (1) responsive hamburger nav for mobile, (2) `role` column on users table for admin/user differentiation, (3) contact page as a ticket system with admin management, and (4) Cloudflare Turnstile form protection on ticket submission.

---

## 1. Responsive Navbar with Hamburger Menu

### Modify `apps/web/app/components/Nav.tsx`

- Add `useState` for `menuOpen` boolean
- Add hamburger button (visible only on `md:` breakpoint and below) using `ListIcon` from `@phosphor-icons/react`
- Wrap nav links in a mobile dropdown container that shows/hides based on `menuOpen`
- Desktop layout (links inline) unchanged; mobile layout stacks vertically in a dropdown below the nav bar
- Close menu on link click and on outside click

**Tailwind approach:**

- Use `hidden md:flex` for desktop nav links container
- Use `md:hidden` for hamburger button
- Use conditional `hidden`/`flex` on mobile menu based on `menuOpen` state, with `md:hidden` so it never appears on desktop

**No new dependencies needed** — `@phosphor-icons/react` already installed (use `ListIcon` for hamburger, `XIcon` for close).

---

## 2. User Role Column

### 2a. Modify `packages/db/src/schema.ts`

Add `role` column to users table:

```typescript
export const users = sqliteTable('users', {
	// ... existing fields
	role: text('role', {enum: ['user', 'admin']})
		.notNull()
		.default('user'),
})
```

### 2b. Generate & apply migration

```bash
bun run -F @happy-vibecode/db generate
bun run -F @happy-vibecode/db migrate
```

This creates `packages/db/drizzle/0003_add_user_role.sql`:

```sql
ALTER TABLE `users` ADD COLUMN `role` text NOT NULL DEFAULT 'user';
```

### 2c. Update `packages/shared/src/schema/user.ts`

Add `role` to Zod schemas:

```typescript
export const userSchema = z.object({
	// ... existing fields
	role: z.enum(['user', 'admin']).default('user'),
})
```

### 2d. Update `packages/api/src/routes/user.ts`

- Include `role` in GET `/api/user/profile` response
- Update `packages/api/src/middleware/auth.ts` to expose `userRole` variable alongside `userId`

### 2e. Update `apps/web/app/hooks/useAuth.ts`

Add `role` to `AuthState` interface and persist/refresh it.

---

## 3. Contact/Ticket System

### 3a. Database — `packages/db/src/schema.ts`

Add two new tables:

```typescript
export const tickets = sqliteTable('tickets', {
	id: text('id').primaryKey(), // UUID
	userId: text('user_id')
		.notNull()
		.references(() => users.id),
	title: text('title').notNull(),
	topic: text('topic', {
		enum: ['bug', 'feature', 'billing', 'general', 'other'],
	}).notNull(),
	status: text('status', {
		enum: ['open', 'closed'],
	})
		.notNull()
		.default('open'),
	createdAt: integer('created_at', {mode: 'timestamp_ms'}).notNull(),
	updatedAt: integer('updated_at', {mode: 'timestamp_ms'}).notNull(),
})

export const ticketResponses = sqliteTable('ticket_responses', {
	id: text('id').primaryKey(), // UUID
	ticketId: text('ticket_id')
		.notNull()
		.references(() => tickets.id),
	userId: text('user_id')
		.notNull()
		.references(() => users.id),
	message: text('message').notNull(),
	createdAt: integer('created_at', {mode: 'timestamp_ms'}).notNull(),
})
```

### 3b. Shared types — `packages/shared/src/schema/ticket.ts` (new file)

```typescript
import {z} from 'zod'

export const createTicketSchema = z.object({
	title: z.string().min(1).max(200),
	topic: z.enum(['bug', 'feature', 'billing', 'general', 'other']),
	message: z.string().min(1).max(5000),
	turnstileToken: z.string().min(1),
})

export const ticketResponseSchema = z.object({
	message: z.string().min(1).max(5000),
})

export const updateTicketStatusSchema = z.object({
	status: z.enum(['open', 'closed']),
})

export type CreateTicket = z.infer<typeof createTicketSchema>
export type TicketResponse = z.infer<typeof ticketResponseSchema>
export type UpdateTicketStatus = z.infer<typeof updateTicketStatusSchema>
```

Export from `packages/shared/src/index.ts`.

### 3c. API Routes — `packages/api/src/routes/tickets.ts` (new file)

| Method | Path                         | Auth | Role       | Description                                                   |
| ------ | ---------------------------- | ---- | ---------- | ------------------------------------------------------------- |
| POST   | `/api/tickets`               | Yes  | user       | Create ticket (validates Turnstile)                           |
| GET    | `/api/tickets`               | Yes  | user       | List user's own tickets                                       |
| GET    | `/api/tickets/:id`           | Yes  | user/admin | Get ticket detail + responses (user sees own, admin sees all) |
| POST   | `/api/tickets/:id/responses` | Yes  | user/admin | Add response to ticket                                        |
| PATCH  | `/api/tickets/:id/status`    | Yes  | admin      | Update ticket status (open/closed)                            |
| GET    | `/api/tickets/admin/all`     | Yes  | admin      | List all tickets across all users                             |

**Turnstile verification** in POST `/api/tickets`:

```typescript
async function verifyTurnstile(
	token: string,
	secretKey: string,
): Promise<boolean> {
	const res = await fetch(
		'https://challenges.cloudflare.com/turnstile/v0/siteverify',
		{
			method: 'POST',
			body: new URLSearchParams({secret: secretKey, response: token}),
		},
	)
	const data = (await res.json()) as {success: boolean}
	return data.success
}
```

**Admin guard middleware** — reuse `authMiddleware`, then check `user.role === 'admin'` from DB.

Mount in `packages/api/src/index.ts`:

```typescript
import {ticketsRouter} from './routes/tickets.js'
api.route('/tickets', ticketsRouter)
```

### 3d. Frontend — `apps/web/app/contact/page.tsx` (new file)

**User view:**

- Form to create ticket: title input, topic select, message textarea, Turnstile widget, submit button
- List of user's tickets with status badges (open/closed), click to expand detail + conversation thread
- Response form within ticket detail (no Turnstile needed for responses)

**Admin view** (detected via `auth.role === 'admin'`):

- All tickets list with filters (status, topic)
- Click ticket to view detail, respond, toggle status between open/closed
- Status toggle button

**Turnstile widget integration:**

- Load `<script src="https://challenges.cloudflare.com/turnstile/v0.js" async defer>` in the page
- Render widget in a `<div>` with `data-sitekey` set to `TURNSTILE_SITE_KEY` (passed as env var to client, or fetched from a config endpoint)
- On form submit, read the token from the Turnstile callback and include it in the POST body

**Pattern:** Follow existing page patterns — `'use client'`, `useAuth` hook, `Nav` component, `@cloudflare/kumo` Button/Text, `@phosphor-icons/react` icons, Tailwind classes with `kumo-*` tokens.

### 3e. Add Nav item

Update `apps/web/app/components/Nav.tsx` to add a "Contact" nav item:

```typescript
{href: '/contact', label: 'Contact', icon: <EnvelopeSimpleIcon size={18} />},
```

---

## 4. Cloudflare Turnstile Integration

### 4a. Wrangler config — `apps/web/wrangler.jsonc`

Add to `vars`:

```jsonc
"vars": {
  "GITHUB_CLIENT_ID": "Ov23liOufGcx2MYgoM0v",
  "TURNSTILE_SITE_KEY": "<your-site-key>"
}
```

The secret key must be set via CLI (never in config file):

```bash
wrangler secret put TURNSTILE_SECRET_KEY
```

### 4b. Worker Env interface — `apps/web/worker/index.ts`

Add to `Env` interface:

```typescript
TURNSTILE_SITE_KEY: string
TURNSTILE_SECRET_KEY: string
```

### 4c. API Env — `packages/api/src/middleware/auth.ts`

Add to `ApiEnv`:

```typescript
TURNSTILE_SITE_KEY: string
TURNSTILE_SECRET_KEY: string
```

### 4d. Config endpoint (optional)

Add `GET /api/config/turnstile` that returns `{siteKey: string}` so the frontend can dynamically configure the widget without hardcoding the key. Public endpoint, no auth required.

---

## 5. Package Dependencies

### `apps/web/package.json`

No new dependencies required. All icons available from existing `@phosphor-icons/react`. Turnstile uses a script tag, no npm package needed.

### `packages/api/package.json`

No changes — `zod` and `hono` already present.

### `packages/shared/package.json`

No changes — `zod` already a dependency of the api package (shared uses it directly via exports).

---

## 6. Migration Steps (Execution Order)

1. **DB schema** — add `role` column to users, add `tickets` and `ticket_responses` tables
2. **Generate migration** — `bun run -F @happy-vibecode/db generate`
3. **Shared types** — add `ticket.ts` schema, update `user.ts` schema, update `index.ts` exports
4. **API routes** — create `tickets.ts`, update `auth.ts` middleware, update `user.ts` profile response, update `index.ts` to mount router
5. **Worker config** — update `wrangler.jsonc` vars, update `Env` interface
6. **Frontend** — update `Nav.tsx` (responsive + contact link), update `useAuth.ts` (add role), create `contact/page.tsx`
7. **Run typecheck & lint** — `bun run typecheck && bun run lint:fix`

---

## 7. Files to Create/Modify

| File                                   | Action                                                                 |
| -------------------------------------- | ---------------------------------------------------------------------- |
| `packages/db/src/schema.ts`            | Modify — add `role` to users, add `tickets`, `ticket_responses` tables |
| `packages/db/drizzle/0003_*.sql`       | Create — auto-generated migration                                      |
| `packages/shared/src/schema/user.ts`   | Modify — add `role` to Zod schema                                      |
| `packages/shared/src/schema/ticket.ts` | Create — ticket Zod schemas                                            |
| `packages/shared/src/index.ts`         | Modify — export ticket schemas                                         |
| `packages/api/src/middleware/auth.ts`  | Modify — add Turnstile env vars to `ApiEnv`                            |
| `packages/api/src/routes/user.ts`      | Modify — include `role` in profile response                            |
| `packages/api/src/routes/tickets.ts`   | Create — ticket CRUD + admin routes                                    |
| `packages/api/src/index.ts`            | Modify — mount tickets router                                          |
| `apps/web/wrangler.jsonc`              | Modify — add `TURNSTILE_SITE_KEY` var                                  |
| `apps/web/worker/index.ts`             | Modify — add Turnstile env vars                                        |
| `apps/web/app/components/Nav.tsx`      | Modify — hamburger menu + contact link                                 |
| `apps/web/app/hooks/useAuth.ts`        | Modify — add `role` to auth state                                      |
| `apps/web/app/contact/page.tsx`        | Create — ticket system UI                                              |
