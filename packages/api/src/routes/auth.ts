import {type ApiEnv} from '../middleware/auth.js'
import {createDb} from '@happy-vibecode/db'
import {eq} from 'drizzle-orm'
import {Hono} from 'hono'

export const authRouter = new Hono<{Bindings: ApiEnv}>()

authRouter.post('/register', async c => {
	const body = await c.req.json<{email: string; password?: string}>()
	const {schema} = await import('@happy-vibecode/db')
	const db = createDb(c.env.DB)

	const existing = await db.query.users.findFirst({
		where: (u, {eq}) => eq(u.email, body.email),
	})
	if (existing) return c.json({error: 'Email already registered'}, 409)

	const id = crypto.randomUUID()
	const apiToken =
		crypto.randomUUID().replace(/-/g, '') +
		crypto.randomUUID().replace(/-/g, '')
	const now = new Date()

	await db.insert(schema.users).values({
		id,
		email: body.email,
		apiToken,
		createdAt: now,
		updatedAt: now,
	})

	return c.json({id, email: body.email, apiToken}, 201)
})

authRouter.post('/verify', async c => {
	const authHeader = c.req.header('Authorization')
	if (!authHeader?.startsWith('Bearer ')) {
		return c.json({valid: false, error: 'Missing token'}, 401)
	}
	const token = authHeader.slice(7)
	const db = createDb(c.env.DB)

	const user = await db.query.users.findFirst({
		where: (u, {eq}) => eq(u.apiToken, token),
	})

	if (!user) return c.json({valid: false}, 401)
	return c.json({valid: true, userId: user.id, email: user.email})
})

authRouter.post('/token/rotate', async c => {
	const authHeader = c.req.header('Authorization')
	if (!authHeader?.startsWith('Bearer ')) {
		return c.json({error: 'Unauthorized'}, 401)
	}
	const token = authHeader.slice(7)
	const {schema} = await import('@happy-vibecode/db')
	const db = createDb(c.env.DB)

	const user = await db.query.users.findFirst({
		where: (u, {eq}) => eq(u.apiToken, token),
	})
	if (!user) return c.json({error: 'Invalid token'}, 401)

	const newToken =
		crypto.randomUUID().replace(/-/g, '') +
		crypto.randomUUID().replace(/-/g, '')
	await db
		.update(schema.users)
		.set({apiToken: newToken, updatedAt: new Date()})
		.where(eq(schema.users.id, user.id))

	return c.json({apiToken: newToken})
})
