# Fix Discovery, Auth, and Mobile Refresh

## Problem Analysis

### 1. 401 on `/api/agents` — Mobile Auth Client Missing `inferAdditionalFields`

The mobile auth client (`apps/mobile/lib/auth-client.ts`) does NOT include the `inferAdditionalFields` plugin, while the web client does. This means `session.user.apiToken` is `undefined` on mobile for GitHub OAuth users. The mobile app falls back to `SecureStore` legacy token, which is also `null` if the user only signed in via GitHub OAuth. Result: all API calls send `Bearer null` → 401.

**Root cause**: `apps/mobile/lib/auth-client.ts:5-13` — missing `inferAdditionalFields<ReturnType<typeof createAuth>>()` plugin.

### 2. Discovery — BridgeAgent Doesn't Send Initial Status

When a web/mobile client connects to BridgeAgent DO (`apps/web/worker/bridge-agent.ts`), the DO only broadcasts `cli_connected` when a CLI connects. If the CLI is already connected before the web/mobile client joins, the client never receives the status. There's no initial status check on connection.

**Root cause**: `apps/web/worker/bridge-agent.ts:64-69` — CLI connection broadcast only fires when CLI connects, not when web/mobile connects.

### 3. Room ID Mismatch Between CLI and Web/Mobile

- CLI default room: `apiToken.slice(0, 8)` (line 231 in connect.ts)
- Web default room: full `userId` from localStorage
- Mobile default room: full `userId`

These don't match unless the user explicitly passes `-r <userId>` to the CLI.

### 4. Better Auth Rate Limiting Warning

Better Auth can't determine client IP on Cloudflare Workers because it doesn't check `cf-connecting-ip` or `request.cf.clientIP`. The `trustedProxies` config needs to be set.

### 5. Mobile App Has No Manual Refresh

No pull-to-refresh on history screen, no reconnect mechanism on chat screen.

---

## Implementation Plan

### Step 1: Fix Mobile Auth Client

**File**: `apps/mobile/lib/auth-client.ts`

Add `inferAdditionalFields` plugin so `session.user.apiToken` is populated for GitHub OAuth users on mobile.

```typescript
import {inferAdditionalFields} from 'better-auth/client/plugins'
import {expoClient} from '@better-auth/expo/client'
import {createAuthClient} from 'better-auth/react'
import type {createAuth} from '../../worker/auth'
import * as SecureStore from 'expo-secure-store'

export const authClient = createAuthClient({
	baseURL: 'https://happy-vibecode.involvex.workers.dev',
	basePath: '/api/auth',
	plugins: [
		expoClient({
			scheme: 'happy-vibecode',
			storage: SecureStore,
		}),
		inferAdditionalFields<ReturnType<typeof createAuth>>(),
	],
})
```

### Step 2: Fix BridgeAgent — Send Initial CLI Status on Web/Mobile Connect

**File**: `apps/web/worker/bridge-agent.ts`

When a web or mobile client connects, immediately send the current CLI connection status so the client doesn't have to wait for a CLI connect/disconnect event.

```typescript
// After line 68 (after the CLI broadcast block), add:
if (clientType === 'web' || clientType === 'mobile') {
	const cliOnline = !!this.findCli()
	server.send(
		JSON.stringify({
			type: 'status',
			status: cliOnline ? 'cli_connected' : 'cli_disconnected',
		}),
	)
}
```

### Step 3: Add HTTP Status Endpoint to BridgeAgent

**File**: `apps/web/worker/bridge-agent.ts`

Add an HTTP endpoint so the API can query CLI connection status without WebSocket.

```typescript
// Modify the fetch method to handle non-WebSocket requests
override async fetch(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const upgradeHeader = request.headers.get('Upgrade')

  if (!upgradeHeader || upgradeHeader !== 'websocket') {
    // HTTP status check
    if (url.pathname.endsWith('/status')) {
      return Response.json({cliConnected: !!this.findCli()})
    }
    return new Response('Expected WebSocket', {status: 426})
  }
  // ... rest of existing WebSocket code
}
```

### Step 4: Add API Route to Check CLI Status

**File**: `packages/api/src/routes/bridge.ts` (new file)

Create a route that queries the BridgeAgent DO's status endpoint.

```typescript
import {authMiddleware, type ApiEnv} from '../middleware/auth.js'
import {Hono} from 'hono'

export const bridgeRouter = new Hono<{
	Bindings: ApiEnv
	Variables: {userId: string}
}>()

bridgeRouter.use('*', authMiddleware)

bridgeRouter.get('/status', async c => {
	const userId = c.get('userId')
	const roomId = c.req.query('roomId') ?? userId
	const id = c.env.BridgeAgent.idFromName(roomId)
	const stub = c.env.BridgeAgent.get(id)
	const res = await stub.fetch(new Request(`https://do/status`))
	const data = (await res.json()) as {cliConnected: boolean}
	return c.json(data)
})
```

**File**: `packages/api/src/index.ts` — mount the new router:

```typescript
import {bridgeRouter} from './routes/bridge.js'
// ...
api.route('/bridge', bridgeRouter)
```

### Step 5: Add Pull-to-Refresh to Mobile History Screen

**File**: `apps/mobile/app/(tabs)/history.tsx`

Add `RefreshControl` to the FlatList for pull-to-refresh.

```tsx
import {RefreshControl} from 'react-native'

// Add refreshing state
const [refreshing, setRefreshing] = useState(false)

// Add refresh handler
const onRefresh = useCallback(async () => {
  if (!isAuthed || !apiToken) return
  setRefreshing(true)
  try {
    const base = serverUrl ?? 'https://happy-vibecode.involvex.workers.dev'
    const res = await fetch(`${base}/api/sessions?status=closed`, {
      headers: {Authorization: `Bearer ${apiToken}`},
    })
    if (res.ok) {
      const data = (await res.json()) as {sessions: Session[]}
      setSessions(data.sessions ?? [])
      setFiltered(data.sessions ?? [])
    }
  } finally {
    setRefreshing(false)
  }
}, [isAuthed, apiToken, serverUrl])

// Add RefreshControl to FlatList
<FlatList
  refreshControl={
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  }
  // ...existing props
/>
```

### Step 6: Add Pull-to-Refresh and Reconnect to Mobile Chat Screen

**File**: `apps/mobile/app/(tabs)/index.tsx`

Add `RefreshControl` to the messages FlatList for manual WebSocket reconnection.

```tsx
import {RefreshControl} from 'react-native'

// Add refreshing state
const [refreshing, setRefreshing] = useState(false)

// Add reconnect handler
const onRefresh = useCallback(() => {
  setRefreshing(true)
  // Close existing connection
  wsRef.current?.close()
  // The useEffect will re-run and create a new connection
  setTimeout(() => setRefreshing(false), 1000)
}, [])

// Add RefreshControl to FlatList
<FlatList
  refreshControl={
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  }
  // ...existing props
/>
```

### Step 7: Fix Better Auth Rate Limiting — Add trustedProxies

**File**: `apps/web/worker/auth.ts`

Add `trustedProxies` to the Better Auth config. On Cloudflare Workers, the `cf-connecting-ip` header provides the real client IP. Setting `trustedProxies` to `['127.0.0.1']` (or the loopback range) allows Better Auth to extract the IP from standard proxy headers.

```typescript
return betterAuth({
	baseURL,
	basePath: '/api/auth',
	secret: env.BETTER_AUTH_SECRET,
	trustedProxies: ['127.0.0.0/8'],
	// ...rest of config
})
```

### Step 8: Fix CLI Room ID Default

**File**: `packages/cli/src/commands/connect.ts`

The CLI default room is `apiToken.slice(0, 8)` which doesn't match web/mobile's `userId`. Change the default to use `userId` from config when available.

```typescript
// Line ~231: Change from
const roomId: string = opts.room ?? userId ?? apiToken.slice(0, 8)

// To: (already uses userId first, but verify this is correct)
const roomId: string = opts.room ?? userId ?? apiToken.slice(0, 8)
```

This is already correct IF `userId` is stored in the CLI config. The issue is that when users register via CLI, the `userId` IS stored. But when they sign in via GitHub OAuth on web/mobile and then try to connect CLI, the CLI might have a different `userId`. No code change needed here — the fix is documentation/user guidance to use `-r <userId>` flag.

---

## Files to Modify

| File                                 | Change                                         |
| ------------------------------------ | ---------------------------------------------- |
| `apps/mobile/lib/auth-client.ts`     | Add `inferAdditionalFields` plugin             |
| `apps/web/worker/bridge-agent.ts`    | Add initial status send + HTTP status endpoint |
| `packages/api/src/routes/bridge.ts`  | New file — CLI status API route                |
| `packages/api/src/index.ts`          | Mount bridge router                            |
| `apps/mobile/app/(tabs)/history.tsx` | Add pull-to-refresh                            |
| `apps/mobile/app/(tabs)/index.tsx`   | Add pull-to-refresh reconnect                  |
| `apps/web/worker/auth.ts`            | Add `trustedProxies` config                    |

## Verification

1. `bun run typecheck` — ensure no type errors
2. `bun run lint:fix` — fix any lint issues
3. Deploy and test:
   - Mobile app should see `apiToken` in session after GitHub OAuth login
   - `/api/agents` should return 200 with valid token
   - Web/mobile clients should immediately see CLI status on connect
   - Pull-to-refresh should reload history and reconnect WebSocket
   - Better Auth rate limiting warning should be resolved
