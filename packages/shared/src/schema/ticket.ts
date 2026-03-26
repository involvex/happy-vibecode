import {z} from 'zod'

export const ticketTopicSchema = z.enum([
	'bug',
	'feature',
	'billing',
	'general',
	'other',
])

export const ticketStatusSchema = z.enum(['open', 'closed'])

export const createTicketSchema = z.object({
	title: z.string().min(1, 'Title is required').max(200),
	topic: ticketTopicSchema,
	message: z.string().min(1, 'Message is required').max(5000),
	turnstileToken: z.string().optional(),
})

export const ticketResponseSchema = z.object({
	message: z.string().min(1, 'Message is required').max(5000),
})

export const updateTicketStatusSchema = z.object({
	status: ticketStatusSchema,
})

export const ticketSchema = z.object({
	id: z.string().uuid(),
	userId: z.string().uuid(),
	title: z.string(),
	topic: ticketTopicSchema,
	status: ticketStatusSchema,
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
})

export const ticketDetailSchema = ticketSchema.extend({
	responses: z.array(
		z.object({
			id: z.string().uuid(),
			userId: z.string().uuid(),
			message: z.string(),
			createdAt: z.string().datetime(),
		}),
	),
	userEmail: z.string().nullable(),
})

export type TicketTopic = z.infer<typeof ticketTopicSchema>
export type TicketStatus = z.infer<typeof ticketStatusSchema>
export type CreateTicket = z.infer<typeof createTicketSchema>
export type TicketResponse = z.infer<typeof ticketResponseSchema>
export type UpdateTicketStatus = z.infer<typeof updateTicketStatusSchema>
export type Ticket = z.infer<typeof ticketSchema>
export type TicketDetail = z.infer<typeof ticketDetailSchema>
