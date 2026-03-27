import {hashPassword, verifyPassword} from '../utils/password.js'
import {createDb, authUser} from '@happy-vibecode/db'
import {type ApiEnv} from '../middleware/auth.js'
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
	const passwordHash = body.password ? await hashPassword(body.password) : null

	await db.insert(schema.users).values({
		id,
		email: body.email,
		passwordHash,
		apiToken,
		createdAt: now,
		updatedAt: now,
	})

	return c.json({id, email: body.email, apiToken}, 201)
})

authRouter.post('/login', async c => {
	const body = await c.req.json<{email: string; password: string}>()
	if (!body.email || !body.password) {
		return c.json({error: 'Email and password required'}, 400)
	}

	const db = createDb(c.env.DB)
	const user = await db.query.users.findFirst({
		where: (u, {eq}) => eq(u.email, body.email),
	})

	if (!user || !user.passwordHash) {
		return c.json({error: 'Invalid email or password'}, 401)
	}

	const valid = await verifyPassword(body.password, user.passwordHash)
	if (!valid) {
		return c.json({error: 'Invalid email or password'}, 401)
	}

	const {schema} = await import('@happy-vibecode/db')
	await db
		.update(schema.users)
		.set({lastLogin: new Date(), updatedAt: new Date()})
		.where(eq(schema.users.id, user.id))

	return c.json({id: user.id, email: user.email, apiToken: user.apiToken})
})

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

	// Fallback: check auth_user table (Better Auth users)
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
