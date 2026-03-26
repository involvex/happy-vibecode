import {
	createTicketSchema,
	ticketResponseSchema,
	updateTicketStatusSchema,
} from '@happy-vibecode/shared/schema/ticket'
import {authMiddleware, type ApiEnv} from '../middleware/auth.js'
import {createDb} from '@happy-vibecode/db'
import {and, desc, eq} from 'drizzle-orm'
import {Hono} from 'hono'

export const ticketsRouter = new Hono<{
	Bindings: ApiEnv
	Variables: {userId: string; userRole: string}
}>()

ticketsRouter.use('*', authMiddleware)

async function verifyTurnstile(
	token: string,
	secretKey: string,
): Promise<boolean> {
	try {
		const res = await fetch(
			'https://challenges.cloudflare.com/turnstile/v0/siteverify',
			{
				method: 'POST',
				headers: {'Content-Type': 'application/x-www-form-urlencoded'},
				body: new URLSearchParams({
					secret: secretKey,
					response: token,
				}),
			},
		)
		const data = (await res.json()) as {success: boolean}
		return data.success
	} catch {
		return false
	}
}

// POST /api/tickets — create a ticket (user)
ticketsRouter.post('/', async c => {
	const userId = c.get('userId')
	const body = await c.req.json()
	const result = createTicketSchema.safeParse(body)

	if (!result.success) {
		return c.json({error: result.error.issues[0]?.message}, 400)
	}

	const {title, topic, message, turnstileToken} = result.data

	if (turnstileToken) {
		const isValid = await verifyTurnstile(
			turnstileToken,
			c.env.TURNSTILE_SECRET_KEY,
		)
		if (!isValid) {
			return c.json({error: 'Turnstile verification failed'}, 400)
		}
	}

	const db = createDb(c.env.DB)
	const {schema} = await import('@happy-vibecode/db')
	const ticketId = crypto.randomUUID()
	const responseId = crypto.randomUUID()
	const now = new Date()

	await db.insert(schema.tickets).values({
		id: ticketId,
		userId,
		title,
		topic,
		status: 'open',
		createdAt: now,
		updatedAt: now,
	})

	await db.insert(schema.ticketResponses).values({
		id: responseId,
		ticketId,
		userId,
		message,
		createdAt: now,
	})

	return c.json({id: ticketId, title, topic, status: 'open'}, 201)
})

// GET /api/tickets — list user's own tickets
ticketsRouter.get('/', async c => {
	const userId = c.get('userId')
	const db = createDb(c.env.DB)
	const {schema} = await import('@happy-vibecode/db')

	const rows = await db
		.select()
		.from(schema.tickets)
		.where(eq(schema.tickets.userId, userId))
		.orderBy(desc(schema.tickets.createdAt))

	return c.json({
		tickets: rows.map(t => ({
			id: t.id,
			title: t.title,
			topic: t.topic,
			status: t.status,
			createdAt: t.createdAt.toISOString(),
			updatedAt: t.updatedAt.toISOString(),
		})),
	})
})

// GET /api/tickets/admin/all — list all tickets (admin only)
ticketsRouter.get('/admin/all', async c => {
	const userRole = c.get('userRole')
	if (userRole !== 'admin') {
		return c.json({error: 'Forbidden'}, 403)
	}

	const db = createDb(c.env.DB)
	const {schema} = await import('@happy-vibecode/db')

	const rows = await db
		.select({
			id: schema.tickets.id,
			userId: schema.tickets.userId,
			title: schema.tickets.title,
			topic: schema.tickets.topic,
			status: schema.tickets.status,
			createdAt: schema.tickets.createdAt,
			updatedAt: schema.tickets.updatedAt,
			userEmail: schema.users.email,
		})
		.from(schema.tickets)
		.leftJoin(schema.users, eq(schema.tickets.userId, schema.users.id))
		.orderBy(desc(schema.tickets.createdAt))

	return c.json({
		tickets: rows.map(t => ({
			id: t.id,
			userId: t.userId,
			title: t.title,
			topic: t.topic,
			status: t.status,
			userEmail: t.userEmail,
			createdAt: t.createdAt.toISOString(),
			updatedAt: t.updatedAt.toISOString(),
		})),
	})
})

// GET /api/tickets/:id — get ticket detail with responses
ticketsRouter.get('/:id', async c => {
	const userId = c.get('userId')
	const userRole = c.get('userRole')
	const ticketId = c.req.param('id')
	const db = createDb(c.env.DB)
	const {schema} = await import('@happy-vibecode/db')

	const ticket = await db.query.tickets.findFirst({
		where: (t, {eq}) => eq(t.id, ticketId),
	})

	if (!ticket) {
		return c.json({error: 'Ticket not found'}, 404)
	}

	if (userRole !== 'admin' && ticket.userId !== userId) {
		return c.json({error: 'Forbidden'}, 403)
	}

	const responses = await db
		.select()
		.from(schema.ticketResponses)
		.where(eq(schema.ticketResponses.ticketId, ticketId))
		.orderBy(schema.ticketResponses.createdAt)

	const user = await db.query.users.findFirst({
		where: (u, {eq}) => eq(u.id, ticket.userId),
	})

	return c.json({
		id: ticket.id,
		userId: ticket.userId,
		title: ticket.title,
		topic: ticket.topic,
		status: ticket.status,
		createdAt: ticket.createdAt.toISOString(),
		updatedAt: ticket.updatedAt.toISOString(),
		userEmail: user?.email ?? null,
		responses: responses.map(r => ({
			id: r.id,
			userId: r.userId,
			message: r.message,
			createdAt: r.createdAt.toISOString(),
		})),
	})
})

// POST /api/tickets/:id/responses — add response to ticket
ticketsRouter.post('/:id/responses', async c => {
	const userId = c.get('userId')
	const userRole = c.get('userRole')
	const ticketId = c.req.param('id')
	const body = await c.req.json()
	const result = ticketResponseSchema.safeParse(body)

	if (!result.success) {
		return c.json({error: result.error.issues[0]?.message}, 400)
	}

	const db = createDb(c.env.DB)
	const {schema} = await import('@happy-vibecode/db')

	const ticket = await db.query.tickets.findFirst({
		where: (t, {eq}) => eq(t.id, ticketId),
	})

	if (!ticket) {
		return c.json({error: 'Ticket not found'}, 404)
	}

	if (userRole !== 'admin' && ticket.userId !== userId) {
		return c.json({error: 'Forbidden'}, 403)
	}

	const responseId = crypto.randomUUID()
	const now = new Date()

	await db.insert(schema.ticketResponses).values({
		id: responseId,
		ticketId,
		userId,
		message: result.data.message,
		createdAt: now,
	})

	await db
		.update(schema.tickets)
		.set({updatedAt: now})
		.where(eq(schema.tickets.id, ticketId))

	return c.json({id: responseId, message: result.data.message}, 201)
})

// PATCH /api/tickets/:id/status — update ticket status (admin only)
ticketsRouter.patch('/:id/status', async c => {
	const userRole = c.get('userRole')
	if (userRole !== 'admin') {
		return c.json({error: 'Forbidden'}, 403)
	}

	const ticketId = c.req.param('id')
	const body = await c.req.json()
	const result = updateTicketStatusSchema.safeParse(body)

	if (!result.success) {
		return c.json({error: result.error.issues[0]?.message}, 400)
	}

	const db = createDb(c.env.DB)
	const {schema} = await import('@happy-vibecode/db')

	const ticket = await db.query.tickets.findFirst({
		where: (t, {eq}) => eq(t.id, ticketId),
	})

	if (!ticket) {
		return c.json({error: 'Ticket not found'}, 404)
	}

	await db
		.update(schema.tickets)
		.set({status: result.data.status, updatedAt: new Date()})
		.where(eq(schema.tickets.id, ticketId))

	return c.json({id: ticketId, status: result.data.status})
})
