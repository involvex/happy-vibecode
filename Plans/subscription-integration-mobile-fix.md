# Plan: Subscription Integration Verification + Mobile Shim Fix

## Context

Two tasks requested:

1. **Verify web subscription integration** — The billing/subscription infrastructure (API routes, DB schema, shared types, profile page UI) is already fully implemented end-to-end. Verification confirms it's complete.
2. **Fix mobile shim errors** — `expo-secure-store` shim is missing synchronous `getItem`/`setItem` methods that `@better-auth/expo/client` requires, causing `storage.getItem is not a function`. Metro config unconditionally intercepts modules even when native versions are available.

---

## Task 1: Web Subscription Integration (Verification Only)

The integration is **already complete**. Verified end-to-end:

| Layer  | Component                                                                                               | Status |
| ------ | ------------------------------------------------------------------------------------------------------- | ------ |
| DB     | `packages/db/src/schema.ts` — users table with all Stripe fields                                        | ✅     |
| Types  | `packages/shared/src/schema/user.ts` — `UserSubscription`, `SubscriptionStatus`, `PlanTier` Zod schemas | ✅     |
| Utils  | `packages/api/src/utils/subscription.ts` — `mapUserSubscription()`, `isSubscriptionEntitled()`          | ✅     |
| API    | `packages/api/src/routes/billing.ts` — `POST /checkout-session`, `POST /webhook`                        | ✅     |
| API    | `packages/api/src/routes/user.ts` — `GET /profile`, `GET /subscription`                                 | ✅     |
| Worker | `apps/web/worker/index.ts` — mounts API at `/api/*`, declares Stripe env vars                           | ✅     |
| UI     | `apps/web/app/profile/page.tsx` — subscription display, upgrade button, post-checkout handling          | ✅     |
| Hook   | `apps/web/app/hooks/useAuth.ts` — `subscription: UserSubscription`, `refreshUser()`                     | ✅     |

**No code changes needed for Task 1.**

---

## Task 2: Fix Mobile Shim Errors

### Root Cause

Error chain:

1. `metro.config.js` **unconditionally** redirects `expo-secure-store` → shim (line 28-32)
2. Shim exports only async methods: `getItemAsync`, `setItemAsync`, `deleteItemAsync`
3. `@better-auth/expo/client` calls `storage.getItem(key)` (synchronous) — not found on shim
4. → `TypeError: storage.getItem is not a function`

The repeated warning spam (`Using AsyncStorage fallback`) is caused by `useAuth.ts` calling `SecureStore.getItemAsync()` on every render cycle via `useEffect`.

### Fix A: Add sync methods to `apps/mobile/shims/expo-secure-store.js`

Add synchronous `getItem`/`setItem` using an in-memory Map (populated on first access). This satisfies `@better-auth/expo/client`'s synchronous storage interface. The async methods remain for direct hook usage.

```js
// Add in-memory cache for sync API
const _cache = new Map()

// Add to module.exports:
getItem: (key) => {
  return _cache.get(key) ?? null
},
setItem: (key, value) => {
  _cache.set(key, value)
  // Fire-and-forget persist to AsyncStorage
  getStorage().then(s => s.setItem(key, value)).catch(() => {})
},
deleteItem: (key) => {
  _cache.delete(key)
  getStorage().then(s => s.removeItem(key)).catch(() => {})
},
```

Also fix the async methods to use `.then()` instead of direct `getStorage()` call (since `getStorage()` is now async-safe).

### Fix B: Make Metro intercept conditional in `apps/mobile/metro.config.js`

Change the `resolveRequest` handler to try resolving the real module first, only falling back to the shim when the native module is unavailable:

```js
resolveRequest: (context, moduleName, platform) => {
  const shimPath = SHIMS[moduleName]
  if (shimPath) {
    try {
      return context.resolveRequest(context, moduleName, platform)
    } catch {
      return { filePath: shimPath, type: 'sourceFile' }
    }
  }
  return context.resolveRequest(context, moduleName, platform)
},
```

This ensures that when running with a dev client that has native modules, the real `expo-secure-store` (which has synchronous `getItem`/`setItem` in SDK 55+) is used instead of the shim.

---

## Files to Modify

| File                                     | Change                                                  |
| ---------------------------------------- | ------------------------------------------------------- |
| `apps/mobile/shims/expo-secure-store.js` | Add sync `getItem`/`setItem`/`deleteItem`, cache layer  |
| `apps/mobile/metro.config.js`            | Make shim intercept conditional (try real module first) |

## Files to Verify (read-only)

| File                                     | Purpose                                |
| ---------------------------------------- | -------------------------------------- |
| `packages/api/src/routes/billing.ts`     | Billing API routes (complete)          |
| `packages/api/src/utils/subscription.ts` | Subscription utility (complete)        |
| `packages/api/src/routes/user.ts`        | User/subscription endpoints (complete) |
| `packages/shared/src/schema/user.ts`     | Shared types (complete)                |
| `apps/web/app/profile/page.tsx`          | Profile/billing UI (complete)          |
| `apps/web/app/hooks/useAuth.ts`          | Auth hook with subscription (complete) |
| `apps/web/worker/index.ts`               | Worker routing (complete)              |

## Verification Steps

1. Run `bun run typecheck` to ensure no TypeScript errors
2. Run `bun run lint:fix` to ensure code style compliance
3. Verify mobile app bundles without the `storage.getItem is not a function` error
4. Verify the shim warning appears only once (not repeated spam) when using Expo Go
