import {
	createUserAdminSchema,
	updateUserAdminSchema,
	updateUserStatusSchema,
	userSettingsOverrideSchema,
} from '@happy-vibecode/shared/schema/admin'
import {adminMiddleware, type ApiEnv} from '../middleware/admin.js'
import {hashPassword} from '@happy-vibecode/shared/crypto'
import {and, count, desc, eq, like, or} from 'drizzle-orm'
import {logAuditEvent} from '../lib/audit.js'
import {createDb} from '@happy-vibecode/db'
import {Hono} from 'hono'

export const adminUsersRouter = new Hono<{
	Bindings: ApiEnv
	Variables: {userId: string; userRole: string}
}>()

adminUsersRouter.use('*', adminMiddleware)

// GET /api/admin/users — list users with pagination, search, filter
adminUsersRouter.get('/', async c => {
	const db = createDb(c.env.DB)
	const {schema} = await import('@happy-vibecode/db')

	const page = Math.max(1, Number(c.req.query('page') || 1))
	const pageSize = Math.min(
		100,
		Math.max(1, Number(c.req.query('pageSize') || 20)),
	)
	const search = c.req.query('search') || ''
	const statusFilter = c.req.query('status') || ''
	const roleFilter = c.req.query('role') || ''

	const conditions = []
	if (search) {
		conditions.push(
			or(
				like(schema.users.nickname, `%${search}%`),
				like(schema.users.email, `%${search}%`),
			),
		)
	}
	if (statusFilter) {
		conditions.push(
			eq(
				schema.users.status,
				statusFilter as 'active' | 'suspended' | 'pending',
			),
		)
	}
	if (roleFilter) {
		conditions.push(eq(schema.users.role, roleFilter as 'user' | 'admin'))
	}

	const whereClause = conditions.length > 0 ? and(...conditions) : undefined

	const [totalResult, rows] = await Promise.all([
		db.select({count: count()}).from(schema.users).where(whereClause),
		db
			.select()
			.from(schema.users)
			.where(whereClause)
			.orderBy(desc(schema.users.createdAt))
			.limit(pageSize)
			.offset((page - 1) * pageSize),
	])

	const total = totalResult[0]?.count ?? 0

	return c.json({
		users: rows.map(u => ({
			id: u.id,
			email: u.email,
			nickname: u.nickname,
			githubId: u.githubId,
			role: u.role,
			status: u.status,
			lastLogin: u.lastLogin ? u.lastLogin.toISOString() : null,
			createdAt: u.createdAt.toISOString(),
			updatedAt: u.updatedAt.toISOString(),
		})),
		total,
		page,
		pageSize,
	})
})

// GET /api/admin/users/:id — get single user
adminUsersRouter.get('/:id', async c => {
	const userId = c.req.param('id')
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
		githubId: user.githubId,
		role: user.role,
		status: user.status,
		preferences: user.preferences ? JSON.parse(user.preferences) : null,
		lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
		createdAt: user.createdAt.toISOString(),
		updatedAt: user.updatedAt.toISOString(),
	})
})

// POST /api/admin/users — create user
adminUsersRouter.post('/', async c => {
	const actorId = c.get('userId')
	const body = await c.req.json()
	const result = createUserAdminSchema.safeParse(body)

	if (!result.success) {
		return c.json({error: result.error.issues[0]?.message}, 400)
	}

	const {email, password, nickname, role, status} = result.data
	const db = createDb(c.env.DB)
	const {schema} = await import('@happy-vibecode/db')

	const existing = await db.query.users.findFirst({
		where: (u, {eq}) => eq(u.email, email),
	})
	if (existing) {
		return c.json({error: 'Email already registered'}, 409)
	}

	const id = crypto.randomUUID()
	const now = new Date()
	let passwordHash: string | null = null

	if (password) {
		passwordHash = await hashPassword(password)
	}

	await db.insert(schema.users).values({
		id,
		email,
		passwordHash,
		apiToken: crypto.randomUUID() + crypto.randomUUID(),
		nickname: nickname ?? null,
		role: role as 'user' | 'admin',
		status,
		preferences: JSON.stringify({
			theme: 'system',
			notifications: true,
			language: 'en',
		}),
		createdAt: now,
		updatedAt: now,
	})

	await logAuditEvent(db, {
		actorId,
		targetId: id,
		targetName: nickname || email,
		action: 'user.create',
		details: {email, role, status},
	})

	return c.json({id, email, nickname, role, status}, 201)
})

// PUT /api/admin/users/:id — update user
adminUsersRouter.put('/:id', async c => {
	const actorId = c.get('userId')
	const userId = c.req.param('id')
	const body = await c.req.json()
	const result = updateUserAdminSchema.safeParse(body)

	if (!result.success) {
		return c.json({error: result.error.issues[0]?.message}, 400)
	}

	const db = createDb(c.env.DB)
	const {schema} = await import('@happy-vibecode/db')

	const user = await db.query.users.findFirst({
		where: (u, {eq}) => eq(u.id, userId),
	})

	if (!user) {
		return c.json({error: 'User not found'}, 404)
	}

	const updates: Record<string, unknown> = {updatedAt: new Date()}
	if (result.data.email !== undefined) updates.email = result.data.email
	if (result.data.nickname !== undefined)
		updates.nickname = result.data.nickname
	if (result.data.role !== undefined) updates.role = result.data.role

	await db.update(schema.users).set(updates).where(eq(schema.users.id, userId))

	await logAuditEvent(db, {
		actorId,
		targetId: userId,
		targetName: user.nickname || user.email,
		action: 'user.update',
		details: result.data,
	})

	return c.json({id: userId, ...result.data})
})

// PATCH /api/admin/users/:id/status — suspend/reactivate
adminUsersRouter.patch('/:id/status', async c => {
	const actorId = c.get('userId')
	const userId = c.req.param('id')
	const body = await c.req.json()
	const result = updateUserStatusSchema.safeParse(body)

	if (!result.success) {
		return c.json({error: result.error.issues[0]?.message}, 400)
	}

	const db = createDb(c.env.DB)
	const {schema} = await import('@happy-vibecode/db')

	const user = await db.query.users.findFirst({
		where: (u, {eq}) => eq(u.id, userId),
	})

	if (!user) {
		return c.json({error: 'User not found'}, 404)
	}

	await db
		.update(schema.users)
		.set({status: result.data.status, updatedAt: new Date()})
		.where(eq(schema.users.id, userId))

	await logAuditEvent(db, {
		actorId,
		targetId: userId,
		targetName: user.nickname || user.email,
		action: `user.${result.data.status}`,
		details: {previousStatus: user.status, newStatus: result.data.status},
	})

	return c.json({id: userId, status: result.data.status})
})

// DELETE /api/admin/users/:id — delete user
adminUsersRouter.delete('/:id', async c => {
	const actorId = c.get('userId')
	const userId = c.req.param('id')

	const db = createDb(c.env.DB)
	const {schema} = await import('@happy-vibecode/db')

	const user = await db.query.users.findFirst({
		where: (u, {eq}) => eq(u.id, userId),
	})

	if (!user) {
		return c.json({error: 'User not found'}, 404)
	}

	await logAuditEvent(db, {
		actorId,
		targetId: userId,
		targetName: user.nickname || user.email,
		action: 'user.delete',
		details: {email: user.email},
	})

	await db.delete(schema.users).where(eq(schema.users.id, userId))

	return c.json({ok: true, message: 'User deleted'})
})

// PUT /api/admin/users/:id/settings — override user preferences
adminUsersRouter.put('/:id/settings', async c => {
	const actorId = c.get('userId')
	const userId = c.req.param('id')
	const body = await c.req.json()
	const result = userSettingsOverrideSchema.safeParse(body)

	if (!result.success) {
		return c.json({error: result.error.issues[0]?.message}, 400)
	}

	const db = createDb(c.env.DB)
	const {schema} = await import('@happy-vibecode/db')

	const user = await db.query.users.findFirst({
		where: (u, {eq}) => eq(u.id, userId),
	})

	if (!user) {
		return c.json({error: 'User not found'}, 404)
	}

	const existingPrefs = user.preferences ? JSON.parse(user.preferences) : {}
	const mergedPrefs = {...existingPrefs, ...result.data}

	await db
		.update(schema.users)
		.set({
			preferences: JSON.stringify(mergedPrefs),
			updatedAt: new Date(),
		})
		.where(eq(schema.users.id, userId))

	await logAuditEvent(db, {
		actorId,
		targetId: userId,
		targetName: user.nickname || user.email,
		action: 'user.settings_override',
		details: result.data,
	})

	return c.json({id: userId, preferences: mergedPrefs})
})

// POST /api/admin/users/:id/reset-password — admin password reset
adminUsersRouter.post('/:id/reset-password', async c => {
	const actorId = c.get('userId')
	const userId = c.req.param('id')
	const body = (await c.req.json().catch(() => ({}))) as {newPassword?: string}

	const db = createDb(c.env.DB)
	const {schema} = await import('@happy-vibecode/db')

	const user = await db.query.users.findFirst({
		where: (u, {eq}) => eq(u.id, userId),
	})

	if (!user) {
		return c.json({error: 'User not found'}, 404)
	}

	const newPassword = body.newPassword || crypto.randomUUID().slice(0, 12)
	const passwordHash = await hashPassword(newPassword)

	await db
		.update(schema.users)
		.set({passwordHash, updatedAt: new Date()})
		.where(eq(schema.users.id, userId))

	await logAuditEvent(db, {
		actorId,
		targetId: userId,
		targetName: user.nickname || user.email,
		action: 'user.password_reset',
		details: {hasNewPassword: !!body.newPassword},
	})

	return c.json({
		ok: true,
		message: 'Password reset',
		temporaryPassword: body.newPassword ? undefined : newPassword,
	})
})
