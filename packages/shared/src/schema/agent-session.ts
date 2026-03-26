import {z} from 'zod'

export const connectionStatusSchema = z.enum([
	'connecting',
	'connected',
	'disconnected',
	'error',
])

export const agentTypeSchema = z.enum([
	'claude',
	'gemini',
	'codex',
	'opencode',
	'custom',
])

export const agentSessionSchema = z.object({
	id: z.string().uuid(),
	userId: z.string().uuid(),
	agentType: agentTypeSchema,
	connectionStatus: connectionStatusSchema,
	roomId: z.string(),
	startedAt: z.string().datetime(),
	endedAt: z.string().datetime().optional(),
	metadata: z.record(z.string(), z.unknown()).optional(),
})

export const createAgentSessionSchema = z.object({
	userId: z.string().uuid(),
	agentType: agentTypeSchema,
	roomId: z.string(),
	metadata: z.record(z.string(), z.unknown()).optional(),
})

export type ConnectionStatus = z.infer<typeof connectionStatusSchema>
export type AgentType = z.infer<typeof agentTypeSchema>
export type AgentSession = z.infer<typeof agentSessionSchema>
export type CreateAgentSession = z.infer<typeof createAgentSessionSchema>
