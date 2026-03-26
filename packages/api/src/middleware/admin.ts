import {authMiddleware, type ApiEnv} from './auth.js'
import {createMiddleware} from 'hono/factory'
import {createDb} from '@happy-vibecode/db'
import {sql} from 'drizzle-orm'

export const adminMiddleware = createMiddleware<{
	Bindings: ApiEnv
	Variables: {userId: string; userRole: string}
}>(async (c, next) => {
	// Run auth first
	await authMiddleware(c, async () => {})

	const userRole = c.get('userRole')
	if (userRole !== 'admin') {
		return c.json({error: 'Admin access required'}, 403)
	}

	const db = createDb(c.env.DB)
	const {schema} = await import('@happy-vibecode/db')

	const role = await db.query.roles.findFirst({
		where: sql`lower(${schema.roles.name}) = lower(${userRole})`,
	})

	if (!role) {
		return c.json({error: 'Role not found in system'}, 403)
	}

	await next()
})

export function requirePermission(
	_module: string,
	_action: string,
): ReturnType<
	typeof createMiddleware<{
		Bindings: ApiEnv
		Variables: {userId: string; userRole: string}
	}>
> {
	return createMiddleware<{
		Bindings: ApiEnv
		Variables: {userId: string; userRole: string}
	}>(async (c, next) => {
		const userRole = c.get('userRole')

		// Super admin / admin bypass
		if (userRole === 'admin') {
			await next()
			return
		}

		// For custom roles, check permissions JSON
		const userId = c.get('userId')
		const db = createDb(c.env.DB)
		const {schema} = await import('@happy-vibecode/db')

		const user = await db.query.users.findFirst({
			where: (u, {eq}) => eq(u.id, userId),
		})

		if (!user) {
			return c.json({error: 'User not found'}, 401)
		}

		const role = await db.query.roles.findFirst({
			where: sql`lower(${schema.roles.name}) = lower(${user.role})`,
		})

		if (!role) {
			return c.json({error: 'Role not found'}, 403)
		}

		const permissions = JSON.parse(role.permissions) as Record<string, string>
		const modulePerms = permissions[_module]

		if (!modulePerms || !modulePerms.includes(_action)) {
			return c.json({error: 'Insufficient permissions'}, 403)
		}

		await next()
	})
}

export type {ApiEnv}
