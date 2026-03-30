import {z} from 'zod'

export const messageRoleSchema = z.enum(['user', 'assistant', 'system', 'tool'])

export const messageSchema = z.object({
	id: z.string().uuid(),
	sessionId: z.string().uuid(),
	role: messageRoleSchema,
	content: z.string(),
	timestamp: z.string().datetime(),
	metadata: z.record(z.string(), z.unknown()).optional(),
})

export const createMessageSchema = z.object({
	sessionId: z.string().uuid(),
	role: messageRoleSchema,
	content: z.string(),
	metadata: z.record(z.string(), z.unknown()).optional(),
})

export const wsMessageSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('prompt'),
		content: z.string(),
		sessionId: z.string(),
	}),
	z.object({
		type: z.literal('response'),
		content: z.string(),
		sessionId: z.string(),
		done: z.boolean().optional(),
	}),
	z.object({
		type: z.literal('error'),
		message: z.string(),
		sessionId: z.string().optional(),
	}),
	z.object({
		type: z.literal('status'),
		status: z.string(),
		sessionId: z.string().optional(),
	}),
	z.object({type: z.literal('ping')}),
	z.object({type: z.literal('pong')}),
	z.object({
		type: z.literal('workspace'),
		workspaceId: z.string().optional(),
		workspacePath: z.string().optional(),
	}),
	z.object({
		type: z.literal('model'),
		model: z.string(),
	}),
	z.object({
		type: z.literal('agent_start'),
		agentType: z.string(),
		sessionId: z.string(),
		templateId: z.string().optional(),
		templateVersionId: z.string().optional(),
		parameters: z.record(z.string(), z.unknown()).optional(),
	}),
	z.object({
		type: z.literal('agent_stop'),
		sessionId: z.string(),
		reason: z.string().optional(),
	}),
	z.object({
		type: z.literal('agent_logs'),
		sessionId: z.string(),
		content: z.string(),
		level: z.enum(['info', 'warn', 'error', 'debug']).default('info'),
		done: z.boolean().optional(),
	}),
	z.object({
		type: z.literal('agent_params'),
		sessionId: z.string(),
		parameters: z.record(z.string(), z.unknown()),
	}),
	z.object({
		type: z.literal('agent_status_update'),
		sessionId: z.string(),
		status: z.enum([
			'starting',
			'running',
			'stopped',
			'error',
			'requires_input',
		]),
		details: z.string().optional(),
	}),
	z.object({
		type: z.literal('input'),
		content: z.string(),
		sessionId: z.string(),
	}),
	z.object({
		type: z.literal('model_switch'),
		provider: z.string(),
		model: z.string(),
		sessionId: z.string(),
	}),
	z.object({
		type: z.literal('model_switch_ack'),
		provider: z.string(),
		model: z.string(),
		sessionId: z.string(),
		success: z.boolean(),
		error: z.string().optional(),
	}),
])

export type MessageRole = z.infer<typeof messageRoleSchema>
export type Message = z.infer<typeof messageSchema>
export type CreateMessage = z.infer<typeof createMessageSchema>
export type WsMessage = z.infer<typeof wsMessageSchema>
