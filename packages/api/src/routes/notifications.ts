import {authMiddleware, type ApiEnv} from '../middleware/auth.js'
import {createDb} from '@happy-vibecode/db'
import {Hono} from 'hono'

export const notificationsRouter = new Hono<{
	Bindings: ApiEnv
	Variables: {userId: string}
}>()

notificationsRouter.use('*', authMiddleware)

notificationsRouter.get('/preferences', async c => {
	const userId = c.get('userId')
	const db = createDb(c.env.DB)

	const prefs = await db.query.notificationPreferences?.findFirst({
		where: (p, {eq}) => eq(p.userId, userId),
	})

	if (!prefs) {
		return c.json({
			preferences: {
				agentCompleted: true,
				agentError: true,
				agentRequiresInput: true,
				quietHoursStart: null,
				quietHoursEnd: null,
			},
		})
	}

	return c.json({preferences: prefs})
})

notificationsRouter.put('/preferences', async c => {
	const userId = c.get('userId')
	const body = await c.req.json()
	const {schema} = await import('@happy-vibecode/db')
	const db = createDb(c.env.DB)
	const now = new Date()

	const existing = await db.query.notificationPreferences?.findFirst({
		where: (p, {eq}) => eq(p.userId, userId),
	})

	if (existing) {
		await db
			.update(schema.notificationPreferences)
			.set({
				...body,
				updatedAt: now,
			})
			.where(
				(await import('drizzle-orm')).eq(
					schema.notificationPreferences.userId,
					userId,
				),
			)
	} else {
		await db.insert(schema.notificationPreferences).values({
			id: crypto.randomUUID(),
			userId,
			agentCompleted: body.agentCompleted ?? true,
			agentError: body.agentError ?? true,
			agentRequiresInput: body.agentRequiresInput ?? true,
			quietHoursStart: body.quietHoursStart ?? null,
			quietHoursEnd: body.quietHoursEnd ?? null,
			createdAt: now,
			updatedAt: now,
		})
	}

	return c.json({ok: true})
})

notificationsRouter.post('/test', async c => {
	const userId = c.get('userId')
	const db = createDb(c.env.DB)

	const devices = await db.query.deviceTokens.findMany({
		where: (d, {eq}) => eq(d.userId, userId),
	})

	if (devices.length === 0) {
		return c.json({error: 'No registered devices'}, 400)
	}

	const {sendPushToUser} = await import('../services/push-notifications.js')
	await sendPushToUser(
		userId,
		{
			title: 'Happy Vibecode',
			body: 'Push notifications are working!',
			data: {type: 'test'},
			sound: 'default',
		},
		c.env as any,
	)

	return c.json({ok: true, deviceCount: devices.length})
})
