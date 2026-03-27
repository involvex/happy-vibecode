import {authMiddleware, type ApiEnv} from '../middleware/auth.js'
import {Hono} from 'hono'

export const bridgeRouter = new Hono<{
	Bindings: ApiEnv
	Variables: {userId: string}
}>()

bridgeRouter.use('*', authMiddleware)

bridgeRouter.get('/status', async c => {
	const userId = c.get('userId')
	const roomId = c.req.query('roomId') ?? userId
	const id = c.env.BridgeAgent.idFromName(roomId)
	const stub = c.env.BridgeAgent.get(id)
	const res = await stub.fetch(new Request(`https://do/status`))
	const data = (await res.json()) as {cliConnected: boolean}
	return c.json(data)
})
