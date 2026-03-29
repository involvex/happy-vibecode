import {authMiddleware, type ApiEnv} from '../middleware/auth.js'
import {createDb} from '@happy-vibecode/db'
import {eq} from 'drizzle-orm'
import {Hono} from 'hono'

export const sessionsRouter = new Hono<{
	Bindings: ApiEnv
	Variables: {userId: string}
}>()

sessionsRouter.use('*', authMiddleware)

sessionsRouter.get('/', async c => {
	const userId = c.get('userId')
	const status = c.req.query('status')
	const db = createDb(c.env.DB)

	const sessions = await db.query.agentSessions.findMany({
		where: (s, {eq, and}) =>
			status
				? and(eq(s.userId, userId), eq(s.connectionStatus, status as any))
				: eq(s.userId, userId),
		orderBy: (s, {desc}) => [desc(s.startedAt)],
	})

	return c.json({sessions})
})

sessionsRouter.get('/:id', async c => {
	const userId = c.get('userId')
	const {id} = c.req.param()
	const db = createDb(c.env.DB)

	const session = await db.query.agentSessions.findFirst({
		where: (s, {and, eq}) => and(eq(s.id, id), eq(s.userId, userId)),
	})

	if (!session) return c.json({error: 'Session not found'}, 404)
	return c.json({session})
})

sessionsRouter.get('/:id/messages', async c => {
	const userId = c.get('userId')
	const {id} = c.req.param()
	const db = createDb(c.env.DB)
	const {schema} = await import('@happy-vibecode/db')

	const session = await db.query.agentSessions.findFirst({
		where: (s, {and, eq}) => and(eq(s.id, id), eq(s.userId, userId)),
	})
	if (!session) return c.json({error: 'Session not found'}, 404)

	const messages = await db.query.messageLogs.findMany({
		where: (m, {eq}) => eq(m.sessionId, id),
		orderBy: (m, {asc}) => [asc(m.timestamp)],
	})

	return c.json({messages})
})

sessionsRouter.post('/', async c => {
	const userId = c.get('userId')
	const body = await c.req.json()
	const {schema} = await import('@happy-vibecode/db')
	const db = createDb(c.env.DB)

	const id = crypto.randomUUID()
	const now = Date.now()

	await db.insert(schema.agentSessions).values({
		id,
		userId,
		agentType: body.agentType,
		connectionStatus: 'connecting',
		roomId: body.roomId ?? id,
		startedAt: new Date(now),
		metadata: body.metadata ? JSON.stringify(body.metadata) : undefined,
	})

	const session = await db.query.agentSessions.findFirst({
		where: (s, {eq}) => eq(s.id, id),
	})

	return c.json({session}, 201)
})

sessionsRouter.patch('/:id/status', async c => {
	const userId = c.get('userId')
	const {id} = c.req.param()
	const {status} = await c.req.json<{status: string}>()
	const db = createDb(c.env.DB)
	const {schema} = await import('@happy-vibecode/db')

	const session = await db.query.agentSessions.findFirst({
		where: (s, {and, eq}) => and(eq(s.id, id), eq(s.userId, userId)),
	})
	if (!session) return c.json({error: 'Session not found'}, 404)

	const updates: Record<string, unknown> = {connectionStatus: status}
	if (status === 'disconnected') {
		updates.endedAt = new Date()
	}

	await db
		.update(schema.agentSessions)
		.set(updates as any)
		.where(eq(schema.agentSessions.id, id))

	return c.json({ok: true})
})

sessionsRouter.patch('/:id/control', async c => {
	const userId = c.get('userId')
	const {id} = c.req.param()
	const body = await c.req.json<{
		action: string
		parameters?: Record<string, unknown>
	}>()
	const db = createDb(c.env.DB)

	const session = await db.query.agentSessions.findFirst({
		where: (s, {and, eq}) => and(eq(s.id, id), eq(s.userId, userId)),
	})
	if (!session) return c.json({error: 'Session not found'}, 404)

	const bridgeId = c.env.BridgeAgent.idFromName(session.roomId)
	const bridge = c.env.BridgeAgent.get(bridgeId)
	const statusRes = await bridge.fetch(new Request(`http://bridge/status`))
	const status = (await statusRes.json()) as {cliConnected: boolean}

	if (!status.cliConnected) {
		return c.json({error: 'No CLI connected to this bridge'}, 400)
	}

	return c.json({ok: true, action: body.action, cliConnected: true})
})
