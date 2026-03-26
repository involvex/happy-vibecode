import {createMiddleware} from 'hono/factory'
import {createDb} from '@happy-vibecode/db'

export interface ApiEnv {
	DB: D1Database
	KV: KVNamespace
	ASSETS: Fetcher
}

export const authMiddleware = createMiddleware<{
	Bindings: ApiEnv
	Variables: {userId: string}
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
	const user = await db.query.users.findFirst({
		where: (users, {eq}) => eq(users.apiToken, token),
	})

	if (!user) {
		return c.json({error: 'Invalid API token'}, 401)
	}

	c.set('userId', user.id)
	await next()
})
