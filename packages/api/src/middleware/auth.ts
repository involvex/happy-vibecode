import {createDb, authUser} from '@happy-vibecode/db'
import {createMiddleware} from 'hono/factory'
import {eq} from 'drizzle-orm'

export interface ApiEnv {
	DB: D1Database
	KV: KVNamespace
	ASSETS: Fetcher
	TURNSTILE_SITE_KEY: string
	TURNSTILE_SECRET_KEY: string
	AUTH_GITHUB_ID?: string
	AUTH_GITHUB_SECRET?: string
	BETTER_AUTH_SECRET?: string
}

export const authMiddleware = createMiddleware<{
	Bindings: ApiEnv
	Variables: {userId: string; userRole: string}
}>(async (c, next) => {
	const authHeader = c.req.header('Authorization')
	if (!authHeader?.startsWith('Bearer ')) {
		return c.json({error: 'Missing or invalid Authorization header'}, 401)
	}
	const token = authHeader.slice(7)
	if (!token) {
		return c.json({error: 'Missing token'}, 401)
	}

	const db = createDb(c.env.DB)

	// Check legacy users table first (CLI users, email/password users)
	const user = await db.query.users.findFirst({
		where: (users, {eq}) => eq(users.apiToken, token),
	})

	if (user) {
		c.set('userId', user.id)
		c.set('userRole', user.role)
		await next()
		return
	}

	// Fallback: check Better Auth users (GitHub OAuth users whose email had a conflict)
	const authUserRecord = await db
		.select()
		.from(authUser)
		.where(eq(authUser.apiToken, token))
		.get()

	if (!authUserRecord) {
		return c.json({error: 'Invalid API token'}, 401)
	}

	c.set('userId', authUserRecord.id)
	c.set('userRole', authUserRecord.role)
	await next()
})
