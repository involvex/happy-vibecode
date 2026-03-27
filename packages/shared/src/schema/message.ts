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
])

export type MessageRole = z.infer<typeof messageRoleSchema>
export type Message = z.infer<typeof messageSchema>
export type CreateMessage = z.infer<typeof createMessageSchema>
export type WsMessage = z.infer<typeof wsMessageSchema>
