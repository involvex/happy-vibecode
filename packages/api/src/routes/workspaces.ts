import {authMiddleware, type ApiEnv} from '../middleware/auth.js'
import {workspaces as workspacesTable} from '@happy-vibecode/db'
import {createDb} from '@happy-vibecode/db'
import {eq, and} from 'drizzle-orm'
import {Hono} from 'hono'
import {z} from 'zod'

const createWorkspaceSchema = z.object({
	name: z.string().min(1),
	path: z.string().min(1),
	defaultProvider: z
		.enum(['gemini', 'claude', 'codex', 'opencode-ai', 'copilot', 'custom'])
		.optional(),
	defaultModel: z.string().optional(),
})

const updateWorkspaceSchema = z.object({
	name: z.string().min(1).optional(),
	path: z.string().min(1).optional(),
	defaultProvider: z
		.enum(['gemini', 'claude', 'codex', 'opencode-ai', 'copilot', 'custom'])
		.optional(),
	defaultModel: z.string().optional(),
	isActive: z.boolean().optional(),
})

export const workspacesRouter = new Hono<{
	Bindings: ApiEnv
	Variables: {userId: string}
}>()

workspacesRouter.use('*', authMiddleware)

workspacesRouter.get('/', async c => {
	const userId = c.get('userId')
	const db = createDb(c.env.DB)

	const workspaces = await db
		.select()
		.from(workspacesTable)
		.where(eq(workspacesTable.userId, userId))

	return c.json({workspaces})
})

workspacesRouter.post('/', async c => {
	const userId = c.get('userId')
	const db = createDb(c.env.DB)

	const body = await c.req.json()
	const parsed = createWorkspaceSchema.safeParse(body)

	if (!parsed.success) {
		return c.json({error: 'Invalid request', details: parsed.error.issues}, 400)
	}

	const workspace = await db
		.insert(workspacesTable)
		.values({
			id: crypto.randomUUID(),
			userId,
			name: parsed.data.name,
			path: parsed.data.path,
			defaultProvider: parsed.data.defaultProvider,
			defaultModel: parsed.data.defaultModel,
		})
		.returning()

	return c.json({workspace: workspace[0]}, 201)
})

workspacesRouter.get('/:id', async c => {
	const userId = c.get('userId')
	const db = createDb(c.env.DB)
	const id = c.req.param('id')

	const workspace = await db
		.select()
		.from(workspacesTable)
		.where(and(eq(workspacesTable.id, id), eq(workspacesTable.userId, userId)))
		.limit(1)

	if (!workspace[0]) {
		return c.json({error: 'Workspace not found'}, 404)
	}

	return c.json({workspace: workspace[0]})
})

workspacesRouter.put('/:id', async c => {
	const userId = c.get('userId')
	const db = createDb(c.env.DB)
	const id = c.req.param('id')

	const body = await c.req.json()
	const parsed = updateWorkspaceSchema.safeParse(body)

	if (!parsed.success) {
		return c.json({error: 'Invalid request', details: parsed.error.issues}, 400)
	}

	const existing = await db
		.select()
		.from(workspacesTable)
		.where(and(eq(workspacesTable.id, id), eq(workspacesTable.userId, userId)))
		.limit(1)

	if (!existing[0]) {
		return c.json({error: 'Workspace not found'}, 404)
	}

	const updated = await db
		.update(workspacesTable)
		.set({
			...parsed.data,
			updatedAt: new Date(),
		})
		.where(and(eq(workspacesTable.id, id), eq(workspacesTable.userId, userId)))
		.returning()

	return c.json({workspace: updated[0]})
})

workspacesRouter.delete('/:id', async c => {
	const userId = c.get('userId')
	const db = createDb(c.env.DB)
	const id = c.req.param('id')

	const existing = await db
		.select()
		.from(workspacesTable)
		.where(and(eq(workspacesTable.id, id), eq(workspacesTable.userId, userId)))
		.limit(1)

	if (!existing[0]) {
		return c.json({error: 'Workspace not found'}, 404)
	}

	await db
		.delete(workspacesTable)
		.where(and(eq(workspacesTable.id, id), eq(workspacesTable.userId, userId)))

	return c.json({success: true})
})

workspacesRouter.post('/:id/activate', async c => {
	const userId = c.get('userId')
	const db = createDb(c.env.DB)
	const id = c.req.param('id')

	const existing = await db
		.select()
		.from(workspacesTable)
		.where(and(eq(workspacesTable.id, id), eq(workspacesTable.userId, userId)))
		.limit(1)

	if (!existing[0]) {
		return c.json({error: 'Workspace not found'}, 404)
	}

	await db
		.update(workspacesTable)
		.set({isActive: false})
		.where(eq(workspacesTable.userId, userId))

	const activated = await db
		.update(workspacesTable)
		.set({isActive: true, updatedAt: new Date()})
		.where(and(eq(workspacesTable.id, id), eq(workspacesTable.userId, userId)))
		.returning()

	return c.json({workspace: activated[0]})
})
