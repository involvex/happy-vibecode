import {
	createRoleSchema,
	updateRoleSchema,
	bulkAssignRoleSchema,
} from '@happy-vibecode/shared/schema/admin'
import {adminMiddleware, type ApiEnv} from '../middleware/admin.js'
import {logAuditEvent} from '../lib/audit.js'
import {createDb} from '@happy-vibecode/db'
import {count, desc, eq} from 'drizzle-orm'
import {Hono} from 'hono'

export const adminRolesRouter = new Hono<{
	Bindings: ApiEnv
	Variables: {userId: string; userRole: string}
}>()

adminRolesRouter.use('*', adminMiddleware)

// GET /api/admin/roles — list all roles
adminRolesRouter.get('/', async c => {
	const db = createDb(c.env.DB)
	const {schema} = await import('@happy-vibecode/db')

	const roles = await db
		.select()
		.from(schema.roles)
		.orderBy(schema.roles.createdAt)

	// Get user counts per role
	const userCounts = await db
		.select({
			role: schema.users.role,
			count: count(),
		})
		.from(schema.users)
		.groupBy(schema.users.role)

	const countMap = new Map(userCounts.map(r => [r.role, r.count]))

	return c.json({
		roles: roles.map(r => ({
			id: r.id,
			name: r.name,
			description: r.description,
			permissions: JSON.parse(r.permissions) as Record<string, string>,
			userCount: countMap.get(r.name) ?? 0,
			createdAt: r.createdAt.toISOString(),
			updatedAt: r.updatedAt.toISOString(),
		})),
	})
})

// GET /api/admin/roles/:id — get single role
adminRolesRouter.get('/:id', async c => {
	const roleId = c.req.param('id')
	const db = createDb(c.env.DB)
	const {schema} = await import('@happy-vibecode/db')

	const role = await db.query.roles.findFirst({
		where: (r, {eq}) => eq(r.id, roleId),
	})

	if (!role) {
		return c.json({error: 'Role not found'}, 404)
	}

	const userCountResult = await db
		.select({count: count()})
		.from(schema.users)
		.where(eq(schema.users.role, role.name))

	return c.json({
		id: role.id,
		name: role.name,
		description: role.description,
		permissions: JSON.parse(role.permissions) as Record<string, string>,
		userCount: userCountResult[0]?.count ?? 0,
		createdAt: role.createdAt.toISOString(),
		updatedAt: role.updatedAt.toISOString(),
	})
})

// POST /api/admin/roles — create role
adminRolesRouter.post('/', async c => {
	const actorId = c.get('userId')
	const body = await c.req.json()
	const result = createRoleSchema.safeParse(body)

	if (!result.success) {
		return c.json({error: result.error.issues[0]?.message}, 400)
	}

	const {name, description, permissions} = result.data
	const db = createDb(c.env.DB)
	const {schema} = await import('@happy-vibecode/db')

	const existing = await db.query.roles.findFirst({
		where: (r, {eq}) => eq(r.name, name),
	})
	if (existing) {
		return c.json({error: 'Role name already exists'}, 409)
	}

	const id = crypto.randomUUID()
	const now = new Date()

	await db.insert(schema.roles).values({
		id,
		name,
		description: description ?? null,
		permissions: JSON.stringify(permissions),
		createdAt: now,
		updatedAt: now,
	})

	await logAuditEvent(db, {
		actorId,
		action: 'role.create',
		details: {name, permissions},
	})

	return c.json({id, name, description, permissions}, 201)
})

// PUT /api/admin/roles/:id — update role
adminRolesRouter.put('/:id', async c => {
	const actorId = c.get('userId')
	const roleId = c.req.param('id')
	const body = await c.req.json()
	const result = updateRoleSchema.safeParse(body)

	if (!result.success) {
		return c.json({error: result.error.issues[0]?.message}, 400)
	}

	const db = createDb(c.env.DB)
	const {schema} = await import('@happy-vibecode/db')

	const role = await db.query.roles.findFirst({
		where: (r, {eq}) => eq(r.id, roleId),
	})

	if (!role) {
		return c.json({error: 'Role not found'}, 404)
	}

	const updates: Record<string, unknown> = {updatedAt: new Date()}
	if (result.data.name !== undefined) updates.name = result.data.name
	if (result.data.description !== undefined)
		updates.description = result.data.description
	if (result.data.permissions !== undefined)
		updates.permissions = JSON.stringify(result.data.permissions)

	await db.update(schema.roles).set(updates).where(eq(schema.roles.id, roleId))

	await logAuditEvent(db, {
		actorId,
		action: 'role.update',
		details: {roleId, ...result.data},
	})

	return c.json({id: roleId, ...result.data})
})

// DELETE /api/admin/roles/:id — delete role
adminRolesRouter.delete('/:id', async c => {
	const actorId = c.get('userId')
	const roleId = c.req.param('id')
	const db = createDb(c.env.DB)
	const {schema} = await import('@happy-vibecode/db')

	const role = await db.query.roles.findFirst({
		where: (r, {eq}) => eq(r.id, roleId),
	})

	if (!role) {
		return c.json({error: 'Role not found'}, 404)
	}

	// Prevent deleting built-in roles
	const builtInIds = [
		'role_super_admin',
		'role_admin',
		'role_editor',
		'role_viewer',
	]
	if (builtInIds.includes(roleId)) {
		return c.json({error: 'Cannot delete built-in roles'}, 400)
	}

	// Check if users have this role
	const userCountResult = await db
		.select({count: count()})
		.from(schema.users)
		.where(eq(schema.users.role, role.name))

	if ((userCountResult[0]?.count ?? 0) > 0) {
		return c.json({error: 'Cannot delete role with assigned users'}, 400)
	}

	await logAuditEvent(db, {
		actorId,
		action: 'role.delete',
		details: {name: role.name},
	})

	await db.delete(schema.roles).where(eq(schema.roles.id, roleId))

	return c.json({ok: true, message: 'Role deleted'})
})

// POST /api/admin/roles/assign — bulk assign role
adminRolesRouter.post('/assign', async c => {
	const actorId = c.get('userId')
	const body = await c.req.json()
	const result = bulkAssignRoleSchema.safeParse(body)

	if (!result.success) {
		return c.json({error: result.error.issues[0]?.message}, 400)
	}

	const {roleName, userIds} = result.data
	const db = createDb(c.env.DB)
	const {schema} = await import('@happy-vibecode/db')

	// Verify role exists
	const role = await db.query.roles.findFirst({
		where: (r, {eq}) => eq(r.name, roleName),
	})
	if (!role) {
		return c.json({error: 'Role not found'}, 404)
	}

	// Assign role to all users
	const now = new Date()
	for (const uid of userIds) {
		await db
			.update(schema.users)
			.set({role: roleName, updatedAt: now})
			.where(eq(schema.users.id, uid))
	}

	await logAuditEvent(db, {
		actorId,
		action: 'role.bulk_assign',
		details: {roleName, userIds, count: userIds.length},
	})

	return c.json({ok: true, assigned: userIds.length})
})
