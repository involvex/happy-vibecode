import {z} from 'zod'

export const llmProviderSchema = z.enum([
	'gemini',
	'claude',
	'codex',
	'opencode-ai',
	'copilot',
	'custom',
])

export const workspaceSchema = z.object({
	id: z.string(),
	name: z.string().min(1),
	path: z.string().min(1),
	defaultProvider: llmProviderSchema.optional(),
	defaultModel: z.string().optional(),
	isActive: z.boolean().optional(),
	createdAt: z.string().optional(),
	updatedAt: z.string().optional(),
})

export const agentConfigSchema = z.object({
	id: z.string(),
	name: z.string(),
	provider: llmProviderSchema,
	command: z.string(),
	args: z.array(z.string()),
	promptFlag: z.string().optional(),
	modelFlag: z.string().optional(),
	workspaceFlag: z.string().optional(),
	description: z.string(),
})

export type LLMProvider = z.infer<typeof llmProviderSchema>
export type Workspace = z.infer<typeof workspaceSchema>
export type AgentConfig = z.infer<typeof agentConfigSchema>

export const createWorkspaceSchema = workspaceSchema.omit({
	id: true,
	createdAt: true,
	updatedAt: true,
})
export type CreateWorkspace = z.infer<typeof createWorkspaceSchema>

export const updateWorkspaceSchema = workspaceSchema.partial()
export type UpdateWorkspace = z.infer<typeof updateWorkspaceSchema>
