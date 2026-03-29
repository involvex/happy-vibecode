import {
	rateLimitMiddleware,
	dailyQuotaMiddleware,
} from './middleware/rate-limit.js'
import {agentTemplatesRouter} from './routes/agent-templates.js'
import {adminAnalyticsRouter} from './routes/admin-analytics.js'
import {notificationsRouter} from './routes/notifications.js'
import {adminAgentsRouter} from './routes/admin-agents.js'
import {adminUsersRouter} from './routes/admin-users.js'
import {adminRolesRouter} from './routes/admin-roles.js'
import {adminAuditRouter} from './routes/admin-audit.js'
import {workspacesRouter} from './routes/workspaces.js'
import {sessionsRouter} from './routes/sessions.js'
import {ticketsRouter} from './routes/tickets.js'
import {devicesRouter} from './routes/devices.js'
import {billingRouter} from './routes/billing.js'
import type {ApiEnv} from './middleware/auth.js'
import {bridgeRouter} from './routes/bridge.js'
import {agentsRouter} from './routes/agents.js'
import {reposRouter} from './routes/repos.js'
import {userRouter} from './routes/user.js'
import {syncRouter} from './routes/sync.js'
import {authRouter} from './routes/auth.js'
import {logger} from 'hono/logger'
import {cors} from 'hono/cors'
import {Hono} from 'hono'

export const api = new Hono<{Bindings: ApiEnv}>().basePath('/api')

api.use('*', logger())
api.use(
	'*',
	cors({origin: '*', allowHeaders: ['Authorization', 'Content-Type']}),
)

api.get('/health', c =>
	c.json({status: 'ok', timestamp: new Date().toISOString()}),
)

api.use('*', dailyQuotaMiddleware)
api.use('*', rateLimitMiddleware)

api.route('/auth', authRouter)
api.route('/billing', billingRouter)
api.route('/sessions', sessionsRouter)
api.route('/devices', devicesRouter)
api.route('/user', userRouter)
api.route('/workspaces', workspacesRouter)
api.route('/agents', agentsRouter)
api.route('/bridge', bridgeRouter)
api.route('/tickets', ticketsRouter)
api.route('/notifications', notificationsRouter)
api.route('/templates', agentTemplatesRouter)
api.route('/sync', syncRouter)
api.route('/repos', reposRouter)
api.route('/admin/users', adminUsersRouter)
api.route('/admin/roles', adminRolesRouter)
api.route('/admin/analytics', adminAnalyticsRouter)
api.route('/admin/audit', adminAuditRouter)
api.route('/admin/agents', adminAgentsRouter)

api.notFound(c => c.json({error: 'Not found'}, 404))
api.onError((err, c) => {
	console.error('[api error]', err)
	return c.json({error: err.message ?? 'Internal server error'}, 500)
})

export type {ApiEnv}
