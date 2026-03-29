import {authMiddleware, type ApiEnv} from '../middleware/auth.js'
import {createDb} from '@happy-vibecode/db'
import {Hono} from 'hono'

export const syncRouter = new Hono<{
	Bindings: ApiEnv
	Variables: {userId: string}
}>()

syncRouter.use('*', authMiddleware)

syncRouter.post('/process', async c => {
	const userId = c.get('userId')
	const body = await c.req.json<{
		items: Array<{action: string; payload: Record<string, unknown>}>
	}>()

	if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
		return c.json({error: 'No items to process'}, 400)
	}

	if (body.items.length > 50) {
		return c.json({error: 'Maximum 50 items per batch'}, 400)
	}

	const {schema} = await import('@happy-vibecode/db')
	const db = createDb(c.env.DB)
	const now = new Date()
	const results: Array<{
		id: string
		status: string
		result?: unknown
		error?: string
	}> = []

	for (const item of body.items) {
		const id = crypto.randomUUID()
		try {
			let result: unknown = null

			switch (item.action) {
				case 'prompt': {
					const sessionId = item.payload.sessionId as string
					const content = item.payload.content as string
					if (!sessionId || !content) {
						throw new Error('Missing sessionId or content')
					}
					const session = await db.query.agentSessions.findFirst({
						where: (s, {and, eq}) =>
							and(eq(s.id, sessionId), eq(s.userId, userId)),
					})
					if (!session) throw new Error('Session not found')
					result = {sessionId, queued: true}
					break
				}
				case 'update_preferences': {
					const prefs = item.payload
					const {eq} = await import('drizzle-orm')
					await db
						.update(schema.users)
						.set({
							preferences: JSON.stringify(prefs),
							updatedAt: now,
						})
						.where(eq(schema.users.id, userId))
					result = {updated: true}
					break
				}
				case 'toggle_template_public': {
					const templateId = item.payload.templateId as string
					if (!templateId) throw new Error('Missing templateId')
					const {eq, and} = await import('drizzle-orm')
					const template = await db.query.agentTemplates?.findFirst({
						where: (t, {and, eq}) =>
							and(eq(t.id, templateId), eq(t.userId, userId)),
					})
					if (!template)
						throw new Error('Template not found or not owned by user')
					await db
						.update(schema.agentTemplates)
						.set({isPublic: !template.isPublic, updatedAt: now})
						.where(eq(schema.agentTemplates.id, templateId))
					result = {isPublic: !template.isPublic}
					break
				}
				default:
					throw new Error(`Unknown action: ${item.action}`)
			}

			await db.insert(schema.offlineSyncQueue).values({
				id,
				userId,
				action: item.action as any,
				payload: JSON.stringify(item.payload),
				status: 'completed',
				createdAt: now,
				processedAt: now,
			})

			results.push({id, status: 'completed', result})
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : 'Unknown error'

			await db.insert(schema.offlineSyncQueue).values({
				id,
				userId,
				action: item.action as any,
				payload: JSON.stringify(item.payload),
				status: 'failed',
				createdAt: now,
				processedAt: now,
				error: errorMsg,
			})

			results.push({id, status: 'failed', error: errorMsg})
		}
	}

	return c.json({
		processed: results.length,
		results,
	})
})
