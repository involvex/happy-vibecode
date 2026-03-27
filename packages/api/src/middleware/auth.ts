import {createDb, authUser, users} from '@happy-vibecode/db'
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
	STRIPE_API_KEY?: string
	STRIPE_WEBHOOK_SECRET?: string
	STRIPE_PRO_PRODUCT_ID?: string
	STRIPE_PRO_PRICE_ID?: string
	STRIPE_PRO_URL?: string
	SRIPE_PRO_URL?: string
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

	// Fast path: token is already in the users table (CLI / email users, or GitHub
	// users whose apiToken was synced by the databaseHook)
	const user = await db.query.users.findFirst({
		where: (u, {eq}) => eq(u.apiToken, token),
	})

	if (user) {
		c.set('userId', user.id)
		c.set('userRole', user.role)
		await next()
		return
	}

	// Fallback: check Better Auth users table (GitHub OAuth users whose legacy
	// users row wasn't synced yet — e.g. signed in before the sync fix was deployed)
	const authUserRecord = await db
		.select()
		.from(authUser)
		.where(eq(authUser.apiToken, token))
		.get()

	if (!authUserRecord) {
		return c.json({error: 'Invalid API token'}, 401)
	}

	// Resolve the canonical users row for this Better Auth user so that route
	// handlers which query users.id continue to work for pre-existing accounts
	let userId = authUserRecord.id
	let userRole = (authUserRecord.role as string) ?? 'user'
	const now = new Date()

	const usersById = await db.query.users.findFirst({
		where: (u, {eq}) => eq(u.id, authUserRecord.id),
	})

	if (usersById) {
		userId = usersById.id
		userRole = usersById.role
	} else if (authUserRecord.email) {
		// Pre-existing user: same email, but registered before Better Auth with a
		// different id. Use their original row as the canonical identity and sync
		// the new token so the fast path works on future requests.
		const usersByEmail = await db.query.users.findFirst({
			where: (u, {eq}) => eq(u.email, authUserRecord.email!),
		})
		if (usersByEmail) {
			userId = usersByEmail.id
			userRole = usersByEmail.role
			await db
				.update(users)
				.set({apiToken: token, updatedAt: now})
				.where(eq(users.id, usersByEmail.id))
		} else {
			// No users row at all — create one so routes work
			await db
				.insert(users)
				.values({
					id: authUserRecord.id,
					email: authUserRecord.email ?? null,
					apiToken: token,
					nickname: authUserRecord.name ?? null,
					role: (authUserRecord.role as string) ?? 'user',
					createdAt: now,
					updatedAt: now,
				})
				.onConflictDoNothing()
		}
	} else {
		// No email, no existing row — just use the Better Auth id
		await db
			.insert(users)
			.values({
				id: authUserRecord.id,
				email: null,
				apiToken: token,
				nickname: authUserRecord.name ?? null,
				role: (authUserRecord.role as string) ?? 'user',
				createdAt: now,
				updatedAt: now,
			})
			.onConflictDoNothing()
	}

	c.set('userId', userId)
	c.set('userRole', userRole)
	await next()
})
