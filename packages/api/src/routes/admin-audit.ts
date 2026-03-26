import {adminMiddleware, type ApiEnv} from '../middleware/admin.js'
import {and, count, desc, eq, gte, like, lte} from 'drizzle-orm'
import {createDb} from '@happy-vibecode/db'
import {Hono} from 'hono'

export const adminAuditRouter = new Hono<{
	Bindings: ApiEnv
	Variables: {userId: string; userRole: string}
}>()

adminAuditRouter.use('*', adminMiddleware)

// GET /api/admin/audit — list audit logs
adminAuditRouter.get('/', async c => {
	const db = createDb(c.env.DB)
	const {schema} = await import('@happy-vibecode/db')

	const page = Math.max(1, Number(c.req.query('page') || 1))
	const pageSize = Math.min(
		100,
		Math.max(1, Number(c.req.query('pageSize') || 20)),
	)
	const action = c.req.query('action') || ''
	const actorId = c.req.query('actorId') || ''
	const startDate = c.req.query('startDate')
	const endDate = c.req.query('endDate')

	const conditions = []
	if (action) {
		conditions.push(like(schema.auditLogs.action, `%${action}%`))
	}
	if (actorId) {
		conditions.push(eq(schema.auditLogs.actorId, actorId))
	}
	if (startDate) {
		conditions.push(gte(schema.auditLogs.createdAt, new Date(startDate)))
	}
	if (endDate) {
		conditions.push(lte(schema.auditLogs.createdAt, new Date(endDate)))
	}

	const whereClause = conditions.length > 0 ? and(...conditions) : undefined

	const [totalResult, rows] = await Promise.all([
		db.select({count: count()}).from(schema.auditLogs).where(whereClause),
		db
			.select()
			.from(schema.auditLogs)
			.where(whereClause)
			.orderBy(desc(schema.auditLogs.createdAt))
			.limit(pageSize)
			.offset((page - 1) * pageSize),
	])

	const total = totalResult[0]?.count ?? 0

	return c.json({
		logs: rows.map(l => ({
			id: l.id,
			actorId: l.actorId,
			actorName: l.actorName,
			targetId: l.targetId,
			targetName: l.targetName,
			action: l.action,
			details: l.details,
			createdAt: l.createdAt.toISOString(),
		})),
		total,
		page,
		pageSize,
	})
})
