import {authMiddleware, type ApiEnv} from '../middleware/auth.js'
import {createDb} from '@happy-vibecode/db'
import {Hono} from 'hono'

export const devicesRouter = new Hono<{
	Bindings: ApiEnv
	Variables: {userId: string}
}>()

devicesRouter.use('*', authMiddleware)

devicesRouter.get('/', async c => {
	const userId = c.get('userId')
	const db = createDb(c.env.DB)

	const devices = await db.query.deviceTokens.findMany({
		where: (d, {eq}) => eq(d.userId, userId),
	})

	return c.json({devices})
})

devicesRouter.post('/', async c => {
	const userId = c.get('userId')
	const body = await c.req.json<{
		token: string
		platform: 'ios' | 'android' | 'web'
	}>()
	const {schema} = await import('@happy-vibecode/db')
	const db = createDb(c.env.DB)

	const id = crypto.randomUUID()
	const now = new Date()

	await db.insert(schema.deviceTokens).values({
		id,
		userId,
		token: body.token,
		platform: body.platform,
		createdAt: now,
		updatedAt: now,
	})

	return c.json({id, platform: body.platform}, 201)
})

devicesRouter.delete('/:id', async c => {
	const userId = c.get('userId')
	const {id} = c.req.param()
	const {schema} = await import('@happy-vibecode/db')
	const db = createDb(c.env.DB)
	const {eq, and} = await import('drizzle-orm')

	await db
		.delete(schema.deviceTokens)
		.where(
			and(
				eq(schema.deviceTokens.id, id),
				eq(schema.deviceTokens.userId, userId),
			),
		)

	return c.json({ok: true})
})
