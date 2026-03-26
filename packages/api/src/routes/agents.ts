import {authMiddleware, type ApiEnv} from '../middleware/auth.js'
import {agents as agentsTable} from '@happy-vibecode/db'
import {createDb} from '@happy-vibecode/db'
import {eq, and} from 'drizzle-orm'
import {Hono} from 'hono'
import {z} from 'zod'

const createAgentSchema = z.object({
	name: z.string().min(1),
	command: z.string().min(1),
	args: z.array(z.string()).default([]),
	promptFlag: z.string().optional(),
	modelFlag: z.string().optional(),
	description: z.string().optional(),
	isActive: z.boolean().optional(),
})

const updateAgentSchema = z.object({
	name: z.string().min(1).optional(),
	command: z.string().min(1).optional(),
	args: z.array(z.string()).optional(),
	promptFlag: z.string().optional(),
	modelFlag: z.string().optional(),
	description: z.string().optional(),
	isActive: z.boolean().optional(),
})

export const agentsRouter = new Hono<{
	Bindings: ApiEnv
	Variables: {userId: string; userRole: string}
}>()

agentsRouter.use('*', authMiddleware)

agentsRouter.get('/', async c => {
	const db = createDb(c.env.DB)

	const agents = await db
		.select()
		.from(agentsTable)
		.where(eq(agentsTable.isActive, true))

	const parsed = agents.map(a => ({
		...a,
		args: JSON.parse(a.args) as string[],
	}))

	return c.json({agents: parsed})
})

agentsRouter.get('/:id', async c => {
	const db = createDb(c.env.DB)
	const id = c.req.param('id')

	const agent = await db
		.select()
		.from(agentsTable)
		.where(eq(agentsTable.id, id))
		.limit(1)

	if (!agent[0]) {
		return c.json({error: 'Agent not found'}, 404)
	}

	const parsed = {
		...agent[0],
		args: JSON.parse(agent[0].args) as string[],
	}

	return c.json({agent: parsed})
})

agentsRouter.post('/', async c => {
	const userRole = c.get('userRole')
	if (userRole !== 'admin') {
		return c.json({error: 'Admin access required'}, 403)
	}

	const db = createDb(c.env.DB)
	const body = await c.req.json()
	const parsed = createAgentSchema.safeParse(body)

	if (!parsed.success) {
		return c.json({error: 'Invalid request', details: parsed.error.issues}, 400)
	}

	const now = new Date()
	const inserted = await db
		.insert(agentsTable)
		.values({
			id: crypto.randomUUID(),
			name: parsed.data.name,
			command: parsed.data.command,
			args: JSON.stringify(parsed.data.args),
			promptFlag: parsed.data.promptFlag,
			modelFlag: parsed.data.modelFlag,
			description: parsed.data.description,
			isActive: parsed.data.isActive ?? true,
			createdAt: now,
			updatedAt: now,
		})
		.returning()

	if (!inserted[0]) {
		return c.json({error: 'Failed to create agent'}, 500)
	}

	const result = {
		...inserted[0],
		args: JSON.parse(inserted[0].args) as string[],
	}

	return c.json({agent: result}, 201)
})

agentsRouter.put('/:id', async c => {
	const userRole = c.get('userRole')
	if (userRole !== 'admin') {
		return c.json({error: 'Admin access required'}, 403)
	}

	const db = createDb(c.env.DB)
	const id = c.req.param('id')
	const body = await c.req.json()
	const parsed = updateAgentSchema.safeParse(body)

	if (!parsed.success) {
		return c.json({error: 'Invalid request', details: parsed.error.issues}, 400)
	}

	const existing = await db
		.select()
		.from(agentsTable)
		.where(eq(agentsTable.id, id))
		.limit(1)

	if (!existing[0]) {
		return c.json({error: 'Agent not found'}, 404)
	}

	const updates: Record<string, unknown> = {updatedAt: new Date()}
	if (parsed.data.name !== undefined) updates.name = parsed.data.name
	if (parsed.data.command !== undefined) updates.command = parsed.data.command
	if (parsed.data.args !== undefined)
		updates.args = JSON.stringify(parsed.data.args)
	if (parsed.data.promptFlag !== undefined)
		updates.promptFlag = parsed.data.promptFlag
	if (parsed.data.modelFlag !== undefined)
		updates.modelFlag = parsed.data.modelFlag
	if (parsed.data.description !== undefined)
		updates.description = parsed.data.description
	if (parsed.data.isActive !== undefined)
		updates.isActive = parsed.data.isActive

	const updated = await db
		.update(agentsTable)
		.set(updates)
		.where(eq(agentsTable.id, id))
		.returning()

	if (!updated[0]) {
		return c.json({error: 'Failed to update agent'}, 500)
	}

	const result = {
		...updated[0],
		args: JSON.parse(updated[0].args) as string[],
	}

	return c.json({agent: result})
})

agentsRouter.delete('/:id', async c => {
	const userRole = c.get('userRole')
	if (userRole !== 'admin') {
		return c.json({error: 'Admin access required'}, 403)
	}

	const db = createDb(c.env.DB)
	const id = c.req.param('id')

	const existing = await db
		.select()
		.from(agentsTable)
		.where(eq(agentsTable.id, id))
		.limit(1)

	if (!existing[0]) {
		return c.json({error: 'Agent not found'}, 404)
	}

	await db.delete(agentsTable).where(eq(agentsTable.id, id))

	return c.json({success: true})
})
