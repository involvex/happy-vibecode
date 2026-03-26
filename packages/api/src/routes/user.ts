import {
	changePasswordSchema,
	linkEmailSchema,
	setPasswordSchema,
	updateProfileSchema,
} from '@happy-vibecode/shared/schema/user'
import {hashPassword, verifyPassword} from '@happy-vibecode/shared/crypto'
import {authMiddleware, type ApiEnv} from '../middleware/auth.js'
import {createDb} from '@happy-vibecode/db'
import {eq} from 'drizzle-orm'
import {Hono} from 'hono'

export const userRouter = new Hono<{
	Bindings: ApiEnv
	Variables: {userId: string; userRole: string}
}>()

userRouter.use('*', authMiddleware)

userRouter.get('/profile', async c => {
	const userId = c.get('userId')
	const db = createDb(c.env.DB)
	const {schema} = await import('@happy-vibecode/db')

	const user = await db.query.users.findFirst({
		where: (u, {eq}) => eq(u.id, userId),
	})

	if (!user) {
		return c.json({error: 'User not found'}, 404)
	}

	return c.json({
		id: user.id,
		email: user.email,
		nickname: user.nickname,
		preferences: user.preferences ? JSON.parse(user.preferences) : null,
		githubId: user.githubId,
		hasPassword: !!user.passwordHash,
		role: user.role,
		status: user.status,
		lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
		createdAt: user.createdAt.toISOString(),
		updatedAt: user.updatedAt.toISOString(),
	})
})

userRouter.put('/profile', async c => {
	const userId = c.get('userId')
	const body = await c.req.json()
	const result = updateProfileSchema.safeParse(body)

	if (!result.success) {
		return c.json({error: result.error.issues[0]?.message}, 400)
	}

	const {nickname, preferences} = result.data
	const db = createDb(c.env.DB)
	const {schema} = await import('@happy-vibecode/db')

	const updates: Record<string, unknown> = {updatedAt: new Date()}

	if (nickname !== undefined) {
		updates.nickname = nickname
	}
	if (preferences !== undefined) {
		updates.preferences = JSON.stringify(preferences)
	}

	await db.update(schema.users).set(updates).where(eq(schema.users.id, userId))

	const user = await db.query.users.findFirst({
		where: (u, {eq}) => eq(u.id, userId),
	})

	if (!user) {
		return c.json({error: 'User not found'}, 404)
	}

	return c.json({
		id: user.id,
		email: user.email,
		nickname: user.nickname,
		preferences: user.preferences ? JSON.parse(user.preferences) : null,
		githubId: user.githubId,
		hasPassword: !!user.passwordHash,
		role: user.role,
		status: user.status,
		lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
		createdAt: user.createdAt.toISOString(),
		updatedAt: user.updatedAt.toISOString(),
	})
})

userRouter.post('/password/set', async c => {
	const userId = c.get('userId')
	const body = await c.req.json()
	const result = setPasswordSchema.safeParse(body)

	if (!result.success) {
		return c.json({error: result.error.issues[0]?.message}, 400)
	}

	const {password} = result.data
	const db = createDb(c.env.DB)
	const {schema} = await import('@happy-vibecode/db')

	const user = await db.query.users.findFirst({
		where: (u, {eq}) => eq(u.id, userId),
	})

	if (!user) {
		return c.json({error: 'User not found'}, 404)
	}

	if (user.passwordHash) {
		return c.json({error: 'Password already set'}, 400)
	}

	const passwordHash = await hashPassword(password)

	await db
		.update(schema.users)
		.set({passwordHash, updatedAt: new Date()})
		.where(eq(schema.users.id, userId))

	return c.json({ok: true, message: 'Password set successfully'})
})

userRouter.post('/password/change', async c => {
	const userId = c.get('userId')
	const body = await c.req.json()
	const result = changePasswordSchema.safeParse(body)

	if (!result.success) {
		return c.json({error: result.error.issues[0]?.message}, 400)
	}

	const {currentPassword, newPassword} = result.data
	const db = createDb(c.env.DB)
	const {schema} = await import('@happy-vibecode/db')

	const user = await db.query.users.findFirst({
		where: (u, {eq}) => eq(u.id, userId),
	})

	if (!user) {
		return c.json({error: 'User not found'}, 404)
	}

	if (!user.passwordHash) {
		return c.json({error: 'No password set'}, 400)
	}

	const isValid = await verifyPassword(currentPassword, user.passwordHash)
	if (!isValid) {
		return c.json({error: 'Current password is incorrect'}, 401)
	}

	const passwordHash = await hashPassword(newPassword)

	await db
		.update(schema.users)
		.set({passwordHash, updatedAt: new Date()})
		.where(eq(schema.users.id, userId))

	return c.json({ok: true, message: 'Password changed successfully'})
})

userRouter.post('/link-email', async c => {
	const userId = c.get('userId')
	const body = await c.req.json()
	const result = linkEmailSchema.safeParse(body)

	if (!result.success) {
		return c.json({error: result.error.issues[0]?.message}, 400)
	}

	const {email} = result.data
	const db = createDb(c.env.DB)
	const {schema} = await import('@happy-vibecode/db')

	const user = await db.query.users.findFirst({
		where: (u, {eq}) => eq(u.id, userId),
	})

	if (!user) {
		return c.json({error: 'User not found'}, 404)
	}

	if (user.email) {
		return c.json({error: 'Email already linked'}, 400)
	}

	if (!user.githubId) {
		return c.json({error: 'Only GitHub users can link email'}, 400)
	}

	const existing = await db.query.users.findFirst({
		where: (u, {eq}) => eq(u.email, email),
	})
	if (existing) {
		return c.json({error: 'Email already registered'}, 409)
	}

	await db
		.update(schema.users)
		.set({email, updatedAt: new Date()})
		.where(eq(schema.users.id, userId))

	return c.json({ok: true, message: 'Email linked successfully', email})
})
