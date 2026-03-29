import {z} from 'zod'

export const agentTemplateSchema = z.object({
	id: z.string().uuid(),
	userId: z.string().uuid(),
	name: z.string().min(1, 'Name is required'),
	description: z.string().nullable().optional(),
	tags: z.array(z.string()).default([]),
	isPublic: z.boolean().default(false),
	latestVersionId: z.string().uuid().nullable().optional(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
})

export const createAgentTemplateSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	description: z.string().optional(),
	tags: z.array(z.string()).default([]),
	isPublic: z.boolean().default(false),
})

export const updateAgentTemplateSchema = z.object({
	name: z.string().min(1).optional(),
	description: z.string().optional(),
	tags: z.array(z.string()).optional(),
	isPublic: z.boolean().optional(),
})

export const agentTemplateVersionSchema = z.object({
	id: z.string().uuid(),
	templateId: z.string().uuid(),
	version: z.number().int().positive(),
	promptTemplate: z.string().min(1, 'Prompt template is required'),
	defaultModel: z.string().nullable().optional(),
	defaultProvider: z.string().nullable().optional(),
	tools: z.array(z.string()).default([]),
	parameters: z.record(z.string(), z.unknown()).default({}),
	changeNotes: z.string().nullable().optional(),
	createdAt: z.string().datetime(),
})

export const createAgentTemplateVersionSchema = z.object({
	promptTemplate: z.string().min(1, 'Prompt template is required'),
	defaultModel: z.string().optional(),
	defaultProvider: z.string().optional(),
	tools: z.array(z.string()).default([]),
	parameters: z.record(z.string(), z.unknown()).default({}),
	changeNotes: z.string().optional(),
})

export const instantiateTemplateSchema = z.object({
	templateId: z.string().uuid(),
	versionId: z.string().uuid().optional(),
	roomId: z.string().optional(),
	metadata: z.record(z.string(), z.unknown()).optional(),
})

export const templateListFilterSchema = z.object({
	owner: z.enum(['me', 'public', 'all']).default('all'),
	search: z.string().optional(),
	tags: z.array(z.string()).optional(),
})

export type AgentTemplate = z.infer<typeof agentTemplateSchema>
export type CreateAgentTemplate = z.infer<typeof createAgentTemplateSchema>
export type UpdateAgentTemplate = z.infer<typeof updateAgentTemplateSchema>
export type AgentTemplateVersion = z.infer<typeof agentTemplateVersionSchema>
export type CreateAgentTemplateVersion = z.infer<
	typeof createAgentTemplateVersionSchema
>
export type InstantiateTemplate = z.infer<typeof instantiateTemplateSchema>
export type TemplateListFilter = z.infer<typeof templateListFilterSchema>

export const agentTemplateDetailSchema = agentTemplateSchema.extend({
	versions: z.array(agentTemplateVersionSchema).optional(),
	ownerNickname: z.string().nullable().optional(),
})

export type AgentTemplateDetail = z.infer<typeof agentTemplateDetailSchema>
