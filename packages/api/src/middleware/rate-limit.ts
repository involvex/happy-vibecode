import type {Context, Next} from 'hono'
import type {ApiEnv} from './auth.js'

interface RateLimitConfig {
	windowMs: number
	maxRequests: number
	keyGenerator?: (c: Context<{Bindings: ApiEnv}>) => string
}

const DEFAULT_FREE_LIMITS: RateLimitConfig = {
	windowMs: 60_000,
	maxRequests: 30,
}

const DEFAULT_PRO_LIMITS: RateLimitConfig = {
	windowMs: 60_000,
	maxRequests: 120,
}

const ENDPOINT_LIMITS: Record<string, RateLimitConfig> = {
	'/api/repos': {
		windowMs: 60_000,
		maxRequests: 20,
	},
	'/api/sessions': {
		windowMs: 60_000,
		maxRequests: 10,
	},
	'/api/billing': {
		windowMs: 60_000,
		maxRequests: 5,
	},
}

function getRateLimitKey(
	c: Context<{Bindings: ApiEnv; Variables: {userId: string; userRole: string}}>,
): string {
	const userId = c.get('userId') ?? 'anonymous'
	const path = new URL(c.req.url).pathname
	return `ratelimit:${userId}:${path}`
}

function getWindowKey(key: string, windowMs: number): string {
	const window = Math.floor(Date.now() / windowMs)
	return `${key}:${window}`
}

async function checkRateLimit(
	kv: KVNamespace,
	key: string,
	config: RateLimitConfig,
): Promise<{allowed: boolean; remaining: number; resetMs: number}> {
	const windowKey = getWindowKey(key, config.windowMs)
	const current = await kv.get(windowKey)
	const count = current ? Number.parseInt(current, 10) : 0
	const remaining = Math.max(0, config.maxRequests - count - 1)
	const resetMs =
		(Math.floor(Date.now() / config.windowMs) + 1) * config.windowMs

	if (count >= config.maxRequests) {
		return {allowed: false, remaining: 0, resetMs}
	}

	// Increment counter
	await kv.put(windowKey, String(count + 1), {
		expirationTtl: Math.ceil(config.windowMs / 1000) * 2,
	})

	return {allowed: true, remaining, resetMs}
}

function getEndpointConfig(pathname: string): RateLimitConfig | undefined {
	// Check exact match first, then prefix match
	for (const [pattern, config] of Object.entries(ENDPOINT_LIMITS)) {
		if (pathname === pattern || pathname.startsWith(pattern + '/')) {
			return config
		}
	}
	return undefined
}

export const rateLimitMiddleware = async (
	c: Context<{
		Bindings: ApiEnv
		Variables: {userId: string; userRole: string}
	}>,
	next: Next,
) => {
	const userId = c.get('userId')
	const pathname = new URL(c.req.url).pathname

	// Skip rate limiting for health check
	if (pathname === '/api/health') {
		await next()
		return
	}

	// Skip if no user (unauthenticated routes handle their own limits)
	if (!userId) {
		await next()
		return
	}

	// Admin bypass
	const userRole = c.get('userRole')
	if (userRole === 'admin') {
		await next()
		return
	}

	const {createDb} = await import('@happy-vibecode/db')
	const db = createDb(c.env.DB)
	const user = await db.query.users.findFirst({
		where: (u, {eq}) => eq(u.id, userId),
	})

	const isPro = user?.planTier === 'pro'
	const defaultConfig = isPro ? DEFAULT_PRO_LIMITS : DEFAULT_FREE_LIMITS
	const endpointConfig = getEndpointConfig(pathname)
	const config = endpointConfig ?? defaultConfig

	const key = getRateLimitKey(c)
	const result = await checkRateLimit(c.env.KV, key, config)

	c.header('X-RateLimit-Limit', String(config.maxRequests))
	c.header('X-RateLimit-Remaining', String(result.remaining))
	c.header('X-RateLimit-Reset', String(Math.ceil(result.resetMs / 1000)))

	if (!result.allowed) {
		const retryAfter = Math.ceil((result.resetMs - Date.now()) / 1000)
		c.header('Retry-After', String(retryAfter))
		return c.json(
			{
				error: 'Rate limit exceeded',
				retryAfter,
				limit: config.maxRequests,
				window: config.windowMs / 1000,
			},
			429,
		)
	}

	await next()
}

export const dailyQuotaMiddleware = async (
	c: Context<{
		Bindings: ApiEnv
		Variables: {userId: string; userRole: string}
	}>,
	next: Next,
) => {
	const userId = c.get('userId')
	if (!userId) {
		await next()
		return
	}

	const userRole = c.get('userRole')
	if (userRole === 'admin') {
		await next()
		return
	}

	const user = await (async () => {
		const db = (await import('@happy-vibecode/db')).createDb(c.env.DB)
		return db.query.users.findFirst({
			where: (u, {eq}) => eq(u.id, userId),
		})
	})()

	const isPro = user?.planTier === 'pro'
	const dailyLimit = isPro ? 5000 : 500
	const today = new Date().toISOString().slice(0, 10)
	const quotaKey = `quota:${userId}:${today}`

	const current = await c.env.KV.get(quotaKey)
	const count = current ? Number.parseInt(current, 10) : 0

	if (count >= dailyLimit) {
		return c.json(
			{
				error: 'Daily quota exceeded',
				limit: dailyLimit,
				tier: isPro ? 'pro' : 'free',
			},
			429,
		)
	}

	await c.env.KV.put(quotaKey, String(count + 1), {
		expirationTtl: 86400, // 24 hours
	})

	await next()
}
