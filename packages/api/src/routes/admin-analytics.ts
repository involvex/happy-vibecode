import {adminMiddleware, type ApiEnv} from '../middleware/admin.js'
import {and, count, desc, eq, gte, lte, sql} from 'drizzle-orm'
import {createDb} from '@happy-vibecode/db'
import {Hono} from 'hono'

export const adminAnalyticsRouter = new Hono<{
	Bindings: ApiEnv
	Variables: {userId: string; userRole: string}
}>()

adminAnalyticsRouter.use('*', adminMiddleware)

function parseDateRange(c: {req: {query: (k: string) => string | undefined}}) {
	const start = c.req.query('startDate')
	const end = c.req.query('endDate')
	return {
		startDate: start
			? new Date(start)
			: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
		endDate: end ? new Date(end) : new Date(),
	}
}

// GET /api/admin/analytics/overview — KPIs
adminAnalyticsRouter.get('/overview', async c => {
	const db = createDb(c.env.DB)
	const {schema} = await import('@happy-vibecode/db')

	const now = new Date()
	const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
	const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
	const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
	const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

	const [
		totalUsers,
		dauResult,
		wauResult,
		mauResult,
		newToday,
		newWeek,
		newMonth,
		totalSessions,
		activeSessions,
	] = await Promise.all([
		db.select({count: count()}).from(schema.users),
		db
			.select({count: count()})
			.from(schema.users)
			.where(
				and(
					gte(schema.users.lastLogin, oneDayAgo),
					eq(schema.users.status, 'active'),
				),
			),
		db
			.select({count: count()})
			.from(schema.users)
			.where(
				and(
					gte(schema.users.lastLogin, oneWeekAgo),
					eq(schema.users.status, 'active'),
				),
			),
		db
			.select({count: count()})
			.from(schema.users)
			.where(
				and(
					gte(schema.users.lastLogin, oneMonthAgo),
					eq(schema.users.status, 'active'),
				),
			),
		db
			.select({count: count()})
			.from(schema.users)
			.where(gte(schema.users.createdAt, todayStart)),
		db
			.select({count: count()})
			.from(schema.users)
			.where(gte(schema.users.createdAt, oneWeekAgo)),
		db
			.select({count: count()})
			.from(schema.users)
			.where(gte(schema.users.createdAt, oneMonthAgo)),
		db.select({count: count()}).from(schema.agentSessions),
		db
			.select({count: count()})
			.from(schema.agentSessions)
			.where(eq(schema.agentSessions.connectionStatus, 'connected')),
	])

	return c.json({
		totalUsers: totalUsers[0]?.count ?? 0,
		activeUsers: {
			dau: dauResult[0]?.count ?? 0,
			wau: wauResult[0]?.count ?? 0,
			mau: mauResult[0]?.count ?? 0,
		},
		newSignupsToday: newToday[0]?.count ?? 0,
		newSignupsWeek: newWeek[0]?.count ?? 0,
		newSignupsMonth: newMonth[0]?.count ?? 0,
		totalSessions: totalSessions[0]?.count ?? 0,
		activeSessions: activeSessions[0]?.count ?? 0,
	})
})

// GET /api/admin/analytics/signups — signup trends
adminAnalyticsRouter.get('/signups', async c => {
	const db = createDb(c.env.DB)
	const {schema} = await import('@happy-vibecode/db')
	const {startDate, endDate} = parseDateRange(c)

	const rows = await db
		.select({
			date: sql<string>`date(${schema.users.createdAt} / 1000, 'unixepoch')`,
			count: count(),
		})
		.from(schema.users)
		.where(
			and(
				gte(schema.users.createdAt, startDate),
				lte(schema.users.createdAt, endDate),
			),
		)
		.groupBy(sql`date(${schema.users.createdAt} / 1000, 'unixepoch')`)
		.orderBy(sql`date(${schema.users.createdAt} / 1000, 'unixepoch')`)

	return c.json({
		signups: rows.map(r => ({
			date: r.date,
			count: r.count,
		})),
	})
})

// GET /api/admin/analytics/roles — role distribution
adminAnalyticsRouter.get('/roles', async c => {
	const db = createDb(c.env.DB)
	const {schema} = await import('@happy-vibecode/db')

	const rows = await db
		.select({
			role: schema.users.role,
			count: count(),
		})
		.from(schema.users)
		.groupBy(schema.users.role)

	return c.json({
		distribution: rows.map(r => ({
			role: r.role,
			count: r.count,
		})),
	})
})

// GET /api/admin/analytics/sessions — session metrics
adminAnalyticsRouter.get('/sessions', async c => {
	const db = createDb(c.env.DB)
	const {schema} = await import('@happy-vibecode/db')
	const {startDate, endDate} = parseDateRange(c)

	const rows = await db
		.select({
			date: sql<string>`date(${schema.agentSessions.startedAt} / 1000, 'unixepoch')`,
			count: count(),
		})
		.from(schema.agentSessions)
		.where(
			and(
				gte(schema.agentSessions.startedAt, startDate),
				lte(schema.agentSessions.startedAt, endDate),
			),
		)
		.groupBy(sql`date(${schema.agentSessions.startedAt} / 1000, 'unixepoch')`)
		.orderBy(sql`date(${schema.agentSessions.startedAt} / 1000, 'unixepoch')`)

	return c.json({
		sessions: rows.map(r => ({
			date: r.date,
			count: r.count,
		})),
	})
})

// GET /api/admin/analytics/activity — login frequency (day of week + hour)
adminAnalyticsRouter.get('/activity', async c => {
	const db = createDb(c.env.DB)
	const {schema} = await import('@happy-vibecode/db')
	const {startDate, endDate} = parseDateRange(c)

	const rows = await db
		.select({
			dayOfWeek: sql<number>`CAST(strftime('%w', ${schema.agentSessions.startedAt} / 1000, 'unixepoch') AS INTEGER)`,
			hour: sql<number>`CAST(strftime('%H', ${schema.agentSessions.startedAt} / 1000, 'unixepoch') AS INTEGER)`,
			count: count(),
		})
		.from(schema.agentSessions)
		.where(
			and(
				gte(schema.agentSessions.startedAt, startDate),
				lte(schema.agentSessions.startedAt, endDate),
			),
		)
		.groupBy(
			sql`strftime('%w', ${schema.agentSessions.startedAt} / 1000, 'unixepoch')`,
			sql`strftime('%H', ${schema.agentSessions.startedAt} / 1000, 'unixepoch')`,
		)

	return c.json({
		heatmap: rows.map(r => ({
			dayOfWeek: r.dayOfWeek,
			hour: r.hour,
			count: r.count,
		})),
	})
})
