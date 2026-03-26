import {sessionsRouter} from './routes/sessions.js'
import {devicesRouter} from './routes/devices.js'
import type {ApiEnv} from './middleware/auth.js'
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

api.route('/auth', authRouter)
api.route('/sessions', sessionsRouter)
api.route('/devices', devicesRouter)

api.notFound(c => c.json({error: 'Not found'}, 404))
api.onError((err, c) => {
	console.error('[api error]', err)
	return c.json({error: err.message ?? 'Internal server error'}, 500)
})

export type {ApiEnv}
