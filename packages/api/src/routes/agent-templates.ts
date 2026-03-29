import {authMiddleware, type ApiEnv} from '../middleware/auth.js'
import {createDb} from '@happy-vibecode/db'
import {eq} from 'drizzle-orm'
import {Hono} from 'hono'

export const agentTemplatesRouter = new Hono<{
	Bindings: ApiEnv
	Variables: {userId: string}
}>()

agentTemplatesRouter.use('*', authMiddleware)

agentTemplatesRouter.get('/', async c => {
	const userId = c.get('userId')
	const owner = c.req.query('owner') ?? 'all'
	const search = c.req.query('search')
	const tagsParam = c.req.query('tags')
	const db = createDb(c.env.DB)
	const {eq, or, like, and} = await import('drizzle-orm')
	const {schema} = await import('@happy-vibecode/db')

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let whereClause: any
	if (owner === 'me') {
		whereClause = eq(schema.agentTemplates.userId, userId)
	} else if (owner === 'public') {
		whereClause = eq(schema.agentTemplates.isPublic, true)
	} else {
		whereClause = or(
			eq(schema.agentTemplates.userId, userId),
			eq(schema.agentTemplates.isPublic, true),
		)
	}

	if (search) {
		whereClause = and(
			whereClause,
			like(schema.agentTemplates.name, `%${search}%`),
		)
	}

	const templates = await db.query.agentTemplates?.findMany({
		where: whereClause,
		orderBy: (t, {desc}) => [desc(t.updatedAt)],
	})

	return c.json({templates: templates ?? []})
})

agentTemplatesRouter.post('/', async c => {
	const userId = c.get('userId')
	const body = await c.req.json()
	const {schema} = await import('@happy-vibecode/db')
	const db = createDb(c.env.DB)
	const now = new Date()

	const templateId = crypto.randomUUID()
	const versionId = crypto.randomUUID()

	await db.insert(schema.agentTemplates).values({
		id: templateId,
		userId,
		name: body.name,
		description: body.description ?? null,
		tags: JSON.stringify(body.tags ?? []),
		isPublic: body.isPublic ?? false,
		createdAt: now,
		updatedAt: now,
	})

	await db.insert(schema.agentTemplateVersions).values({
		id: versionId,
		templateId,
		version: 1,
		promptTemplate: body.promptTemplate ?? '',
		defaultModel: body.defaultModel ?? null,
		defaultProvider: body.defaultProvider ?? null,
		tools: JSON.stringify(body.tools ?? []),
		parameters: JSON.stringify(body.parameters ?? {}),
		changeNotes: 'Initial version',
		createdAt: now,
	})

	await db
		.update(schema.agentTemplates)
		.set({latestVersionId: versionId, updatedAt: now})
		.where(eq(schema.agentTemplates.id, templateId))

	const template = await db.query.agentTemplates?.findFirst({
		where: (t, {eq}) => eq(t.id, templateId),
	})

	return c.json({template}, 201)
})

agentTemplatesRouter.get('/:id', async c => {
	const userId = c.get('userId')
	const {id} = c.req.param()
	const db = createDb(c.env.DB)
	const {eq, or} = await import('drizzle-orm')
	const {schema} = await import('@happy-vibecode/db')

	const template = await db.query.agentTemplates?.findFirst({
		where: (t, {and, eq, or}) =>
			and(eq(t.id, id), or(eq(t.userId, userId), eq(t.isPublic, true))),
	})

	if (!template) return c.json({error: 'Template not found'}, 404)

	const versions = await db.query.agentTemplateVersions?.findMany({
		where: (v, {eq}) => eq(v.templateId, id),
		orderBy: (v, {desc}) => [desc(v.version)],
	})

	return c.json({template, versions: versions ?? []})
})

agentTemplatesRouter.put('/:id', async c => {
	const userId = c.get('userId')
	const {id} = c.req.param()
	const body = await c.req.json()
	const {schema} = await import('@happy-vibecode/db')
	const db = createDb(c.env.DB)
	const {eq, and} = await import('drizzle-orm')

	const template = await db.query.agentTemplates?.findFirst({
		where: (t, {and, eq}) => and(eq(t.id, id), eq(t.userId, userId)),
	})

	if (!template) return c.json({error: 'Template not found'}, 404)

	const updates: Record<string, unknown> = {updatedAt: new Date()}
	if (body.name !== undefined) updates.name = body.name
	if (body.description !== undefined) updates.description = body.description
	if (body.tags !== undefined) updates.tags = JSON.stringify(body.tags)
	if (body.isPublic !== undefined) updates.isPublic = body.isPublic

	await db
		.update(schema.agentTemplates)
		.set(updates as any)
		.where(eq(schema.agentTemplates.id, id))

	const updated = await db.query.agentTemplates?.findFirst({
		where: (t, {eq}) => eq(t.id, id),
	})

	return c.json({template: updated})
})

agentTemplatesRouter.delete('/:id', async c => {
	const userId = c.get('userId')
	const {id} = c.req.param()
	const {schema} = await import('@happy-vibecode/db')
	const db = createDb(c.env.DB)
	const {eq, and} = await import('drizzle-orm')

	const template = await db.query.agentTemplates?.findFirst({
		where: (t, {and, eq}) => and(eq(t.id, id), eq(t.userId, userId)),
	})

	if (!template) return c.json({error: 'Template not found'}, 404)

	await db
		.delete(schema.agentTemplateVersions)
		.where(eq(schema.agentTemplateVersions.templateId, id))

	await db.delete(schema.agentTemplates).where(eq(schema.agentTemplates.id, id))

	return c.json({ok: true})
})

agentTemplatesRouter.post('/:id/versions', async c => {
	const userId = c.get('userId')
	const {id} = c.req.param()
	const body = await c.req.json()
	const {schema} = await import('@happy-vibecode/db')
	const db = createDb(c.env.DB)
	const {eq, and} = await import('drizzle-orm')
	const now = new Date()

	const template = await db.query.agentTemplates?.findFirst({
		where: (t, {and, eq}) => and(eq(t.id, id), eq(t.userId, userId)),
	})

	if (!template) return c.json({error: 'Template not found'}, 404)

	const existingVersions = await db.query.agentTemplateVersions?.findMany({
		where: (v, {eq}) => eq(v.templateId, id),
		orderBy: (v, {desc}) => [desc(v.version)],
		limit: 1,
	})

	const nextVersion = (existingVersions?.[0]?.version ?? 0) + 1
	const versionId = crypto.randomUUID()

	await db.insert(schema.agentTemplateVersions).values({
		id: versionId,
		templateId: id,
		version: nextVersion,
		promptTemplate: body.promptTemplate ?? '',
		defaultModel: body.defaultModel ?? null,
		defaultProvider: body.defaultProvider ?? null,
		tools: JSON.stringify(body.tools ?? []),
		parameters: JSON.stringify(body.parameters ?? {}),
		changeNotes: body.changeNotes ?? null,
		createdAt: now,
	})

	await db
		.update(schema.agentTemplates)
		.set({latestVersionId: versionId, updatedAt: now})
		.where(eq(schema.agentTemplates.id, id))

	const version = await db.query.agentTemplateVersions?.findFirst({
		where: (v, {eq}) => eq(v.id, versionId),
	})

	return c.json({version}, 201)
})

agentTemplatesRouter.get('/:id/versions', async c => {
	const userId = c.get('userId')
	const {id} = c.req.param()
	const db = createDb(c.env.DB)
	const {eq, or} = await import('drizzle-orm')
	const {schema} = await import('@happy-vibecode/db')

	const template = await db.query.agentTemplates?.findFirst({
		where: (t, {and, eq, or}) =>
			and(eq(t.id, id), or(eq(t.userId, userId), eq(t.isPublic, true))),
	})

	if (!template) return c.json({error: 'Template not found'}, 404)

	const versions = await db.query.agentTemplateVersions?.findMany({
		where: (v, {eq}) => eq(v.templateId, id),
		orderBy: (v, {desc}) => [desc(v.version)],
	})

	return c.json({versions: versions ?? []})
})

agentTemplatesRouter.get('/:id/versions/:versionId', async c => {
	const userId = c.get('userId')
	const {id, versionId} = c.req.param()
	const db = createDb(c.env.DB)
	const {eq, or, and} = await import('drizzle-orm')
	const {schema} = await import('@happy-vibecode/db')

	const template = await db.query.agentTemplates?.findFirst({
		where: (t, {and, eq, or}) =>
			and(eq(t.id, id), or(eq(t.userId, userId), eq(t.isPublic, true))),
	})

	if (!template) return c.json({error: 'Template not found'}, 404)

	const version = await db.query.agentTemplateVersions?.findFirst({
		where: (v, {and, eq}) => and(eq(v.id, versionId), eq(v.templateId, id)),
	})

	if (!version) return c.json({error: 'Version not found'}, 404)

	return c.json({version})
})

agentTemplatesRouter.post('/:id/instantiate', async c => {
	const userId = c.get('userId')
	const {id} = c.req.param()
	const body = await c.req.json<{
		versionId?: string
		roomId?: string
		metadata?: Record<string, unknown>
	}>()
	const {schema} = await import('@happy-vibecode/db')
	const db = createDb(c.env.DB)
	const {eq, or, and} = await import('drizzle-orm')
	const now = new Date()

	const template = await db.query.agentTemplates?.findFirst({
		where: (t, {and, eq, or}) =>
			and(eq(t.id, id), or(eq(t.userId, userId), eq(t.isPublic, true))),
	})

	if (!template) return c.json({error: 'Template not found'}, 404)

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let version: any
	const versionId = body.versionId
	if (versionId) {
		version = await db.query.agentTemplateVersions?.findFirst({
			where: (v, {and, eq}) => and(eq(v.id, versionId), eq(v.templateId, id)),
		})
	} else {
		version = await db.query.agentTemplateVersions?.findFirst({
			where: (v, {eq}) => eq(v.templateId, id),
			orderBy: (v, {desc}) => [desc(v.version)],
		})
	}

	if (!version) return c.json({error: 'No template version found'}, 404)

	const sessionId = crypto.randomUUID()

	const metadata = {
		...(body.metadata ?? {}),
		templateId: template.id,
		templateVersionId: version.id,
		templateName: template.name,
	}

	await db.insert(schema.agentSessions).values({
		id: sessionId,
		userId,
		agentType: `template:${template.name}`,
		connectionStatus: 'connecting',
		roomId: body.roomId ?? sessionId,
		model: version.defaultModel ?? undefined,
		startedAt: now,
		metadata: JSON.stringify(metadata),
	})

	const session = await db.query.agentSessions.findFirst({
		where: (s, {eq}) => eq(s.id, sessionId),
	})

	return c.json({session, template, version}, 201)
})

agentTemplatesRouter.patch('/:id/share', async c => {
	const userId = c.get('userId')
	const {id} = c.req.param()
	const body = await c.req.json<{isPublic: boolean}>()
	const {schema} = await import('@happy-vibecode/db')
	const db = createDb(c.env.DB)
	const {eq, and} = await import('drizzle-orm')

	const template = await db.query.agentTemplates?.findFirst({
		where: (t, {and, eq}) => and(eq(t.id, id), eq(t.userId, userId)),
	})

	if (!template) return c.json({error: 'Template not found'}, 404)

	await db
		.update(schema.agentTemplates)
		.set({isPublic: body.isPublic, updatedAt: new Date()})
		.where(eq(schema.agentTemplates.id, id))

	return c.json({ok: true, isPublic: body.isPublic})
})

agentTemplatesRouter.post('/:id/duplicate', async c => {
	const userId = c.get('userId')
	const {id} = c.req.param()
	const {schema} = await import('@happy-vibecode/db')
	const db = createDb(c.env.DB)
	const {eq, or, and} = await import('drizzle-orm')
	const now = new Date()

	const template = await db.query.agentTemplates?.findFirst({
		where: (t, {and, eq, or}) =>
			and(eq(t.id, id), or(eq(t.userId, userId), eq(t.isPublic, true))),
	})

	if (!template) return c.json({error: 'Template not found'}, 404)

	const latestVersion = await db.query.agentTemplateVersions?.findFirst({
		where: (v, {eq}) => eq(v.templateId, id),
		orderBy: (v, {desc}) => [desc(v.version)],
	})

	if (!latestVersion) return c.json({error: 'No version to duplicate'}, 400)

	const newTemplateId = crypto.randomUUID()
	const newVersionId = crypto.randomUUID()

	await db.insert(schema.agentTemplates).values({
		id: newTemplateId,
		userId,
		name: `${template.name} (Copy)`,
		description: template.description,
		tags: template.tags,
		isPublic: false,
		createdAt: now,
		updatedAt: now,
	})

	await db.insert(schema.agentTemplateVersions).values({
		id: newVersionId,
		templateId: newTemplateId,
		version: 1,
		promptTemplate: latestVersion.promptTemplate,
		defaultModel: latestVersion.defaultModel,
		defaultProvider: latestVersion.defaultProvider,
		tools: latestVersion.tools,
		parameters: latestVersion.parameters,
		changeNotes: `Duplicated from ${template.name}`,
		createdAt: now,
	})

	await db
		.update(schema.agentTemplates)
		.set({latestVersionId: newVersionId, updatedAt: now})
		.where(eq(schema.agentTemplates.id, newTemplateId))

	const newTemplate = await db.query.agentTemplates?.findFirst({
		where: (t, {eq}) => eq(t.id, newTemplateId),
	})

	return c.json({template: newTemplate}, 201)
})
