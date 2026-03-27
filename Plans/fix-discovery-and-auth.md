# Fix CLI Auth, WebSocket Auth, and Discovery

## Problem Analysis

### Issue 1: CLI gets 401 on `GET /api/agents`

The CLI's stored `apiToken` in `~/.happy/config.json` doesn't exist in either `users` or `auth_user` table. This can happen if:

- User registered via CLI, then the DB was reset/migrated
- User has a stale token from a previous session
- The token was never properly saved

**Impact**: `fetchAgentsFromApi` returns `[]`, CLI falls back to `DEFAULT_AGENTS`. This isn't fatal, but indicates the user's auth is broken.

### Issue 2: WebSocket connections have NO authentication

`apps/web/worker/index.ts:72-79` forwards WebSocket requests to BridgeAgent without validating the Authorization header. The BridgeAgent reads `userId` from the query string (`url.searchParams.get('userId') ?? 'anonymous'`), meaning:

- Anyone can connect to any user's room by knowing their userId
- No token validation happens at all
- Security vulnerability

### Issue 3: Room ID mismatch between CLI and web/mobile

- CLI default room: `userId ?? apiToken.slice(0, 8)` (connect.ts:231)
- Web default room: full `userId` from localStorage
- Mobile default room: full `userId`

If `userId` is missing from CLI config, room IDs don't match → can't discover each other.

### Issue 4: `/api/auth/verify` only checks `users` table

Unlike the auth middleware which has a two-tier lookup (users → auth_user), the `/verify` endpoint only checks `users`. Better Auth users whose token is in `auth_user` but not yet synced to `users` can't verify.

---

## Implementation Plan

### Step 1: Add WebSocket auth validation in worker

**File**: `apps/web/worker/index.ts`

Before forwarding WebSocket requests to BridgeAgent, validate the Bearer token and extract the authenticated userId. Pass the userId to the DO via a header or query param that the DO trusts.

```typescript
if (url.pathname.startsWith('/agents/BridgeAgent/')) {
	const roomId = url.pathname.slice('/agents/BridgeAgent/'.length) || 'default'

	// Validate auth before forwarding to Durable Object
	const authHeader = request.headers.get('Authorization')
	if (!authHeader?.startsWith('Bearer ')) {
		return new Response('Unauthorized', {status: 401})
	}
	const token = authHeader.slice(7)

	// Validate token against DB
	const db = createDb(env.DB)
	const user = await db.query.users.findFirst({
		where: (u, {eq}) => eq(u.apiToken, token),
	})

	let userId = user?.id
	if (!user) {
		// Fallback: check auth_user table
		const authUserRecord = await db
			.select()
			.from(authUser)
			.where(eq(authUser.apiToken, token))
			.get()
		if (!authUserRecord) {
			return new Response('Unauthorized', {status: 401})
		}
		userId = authUserRecord.id
	}

	// Pass authenticated userId to BridgeAgent via header
	const headers = new Headers(request.headers)
	headers.set('X-Authenticated-UserId', userId!)

	const authenticatedRequest = new Request(request.url, {
		method: request.method,
		headers,
		body: request.body,
	})

	const id = env.BridgeAgent.idFromName(roomId)
	const stub = env.BridgeAgent.get(id)
	return stub.fetch(authenticatedRequest)
}
```

### Step 2: Fix BridgeAgent to use authenticated userId

**File**: `apps/web/worker/bridge-agent.ts`

Change the DO to read userId from the `X-Authenticated-UserId` header (set by the worker after auth validation) instead of the query string.

```typescript
// Replace:
const userId = url.searchParams.get('userId') ?? 'anonymous'

// With:
const userId = request.headers.get('X-Authenticated-UserId') ?? 'anonymous'
```

### Step 3: Fix `/api/auth/verify` endpoint

**File**: `packages/api/src/routes/auth.ts`

Add fallback to check `auth_user` table, matching the auth middleware's behavior.

```typescript
authRouter.post('/verify', async c => {
	const authHeader = c.req.header('Authorization')
	if (!authHeader?.startsWith('Bearer ')) {
		return c.json({valid: false, error: 'Missing token'}, 401)
	}
	const token = authHeader.slice(7)
	const db = createDb(c.env.DB)

	// Check users table first
	const user = await db.query.users.findFirst({
		where: (u, {eq}) => eq(u.apiToken, token),
	})
	if (user) return c.json({valid: true, userId: user.id, email: user.email})

	// Fallback: check auth_user table
	const authUserRecord = await db
		.select()
		.from(authUser)
		.where(eq(authUser.apiToken, token))
		.get()
	if (!authUserRecord) return c.json({valid: false}, 401)

	return c.json({
		valid: true,
		userId: authUserRecord.id,
		email: authUserRecord.email,
	})
})
```

### Step 4: Fix CLI connect command

**File**: `packages/cli/src/commands/connect.ts`

1. Verify token before connecting
2. If token is invalid, show clear error with re-login instructions
3. Use verified userId as room ID (not token prefix)

```typescript
.action(async (agentId: string, opts) => {
  const config = requireConfig()
  const {serverUrl, apiToken} = config
  let userId = config.userId
  const verbose: boolean = opts.verbose ?? false

  // Verify token and get userId if not in config
  if (!userId && serverUrl && apiToken) {
    try {
      const res = await fetch(`${serverUrl}/api/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiToken}`,
        },
      })
      if (res.ok) {
        const data = (await res.json()) as {userId: string}
        userId = data.userId
        // Update config with userId
        writeConfig({...config, userId: data.userId})
      }
    } catch {}
  }

  if (!userId) {
    console.error('✗ Could not determine user ID. Please run: happy-vibecode login')
    process.exit(1)
  }

  const roomId: string = opts.room ?? userId
  // ... rest of connect logic
})
```

### Step 5: Add `authUser` import to worker

**File**: `apps/web/worker/index.ts`

Add the import for `authUser` and `createDb` from `@happy-vibecode/db` and `eq` from `drizzle-orm`.

---

## Files to Modify

| File                                   | Change                                               |
| -------------------------------------- | ---------------------------------------------------- |
| `apps/web/worker/index.ts`             | Add WebSocket auth validation, import db/eq/authUser |
| `apps/web/worker/bridge-agent.ts`      | Read userId from X-Authenticated-UserId header       |
| `packages/api/src/routes/auth.ts`      | Add auth_user fallback to /verify endpoint           |
| `packages/cli/src/commands/connect.ts` | Verify token, use userId as room ID                  |

## Verification

1. `bun run typecheck --force` — ensure no type errors
2. `bun run lint:fix` — fix any lint issues
3. Deploy and test:
   - WebSocket connections should require valid Bearer token
   - `/api/auth/verify` should accept tokens from both `users` and `auth_user` tables
   - CLI should auto-detect userId and use it as room ID
   - CLI should show clear error if token is invalid
   - Web/mobile should see CLI connect immediately (same room)
