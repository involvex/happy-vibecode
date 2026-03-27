import {authMiddleware, type ApiEnv} from '../middleware/auth.js'
import {mapUserSubscription} from '../utils/subscription.js'
import {createDb} from '@happy-vibecode/db'
import {eq} from 'drizzle-orm'
import {Hono} from 'hono'

type StripeSubscriptionStatus =
	| 'inactive'
	| 'trialing'
	| 'active'
	| 'past_due'
	| 'canceled'
	| 'unpaid'

type StripeEvent = {
	type: string
	data: {
		object: Record<string, unknown>
	}
}

type StripeCheckoutSession = {
	id: string
	url: string | null
}

type StripeSubscription = {
	id: string
	customer: string | null
	status: StripeSubscriptionStatus
	cancel_at_period_end: boolean
	current_period_end: number | null
	metadata?: {userId?: string}
	items?: {
		data?: Array<{
			price?: {
				id?: string | null
				product?: string | null
			}
		}>
	}
}

export const billingRouter = new Hono<{
	Bindings: ApiEnv
	Variables: {userId: string; userRole: string}
}>()

billingRouter.post('/checkout-session', authMiddleware, async c => {
	if (!c.env.STRIPE_API_KEY) {
		return c.json({error: 'Missing STRIPE_API_KEY'}, 500)
	}

	if (!c.env.STRIPE_PRO_PRICE_ID) {
		return c.json({error: 'Missing STRIPE_PRO_PRICE_ID'}, 500)
	}

	const userId = c.get('userId')
	const db = createDb(c.env.DB)
	const {schema} = await import('@happy-vibecode/db')
	const user = await db.query.users.findFirst({
		where: (u, {eq}) => eq(u.id, userId),
	})

	if (!user) {
		return c.json({error: 'User not found'}, 404)
	}

	if (mapUserSubscription(user).isPro) {
		return c.json({error: 'Pro subscription already active'}, 409)
	}

	const origin = new URL(c.req.url).origin
	const form = new URLSearchParams({
		mode: 'subscription',
		'line_items[0][price]': c.env.STRIPE_PRO_PRICE_ID,
		'line_items[0][quantity]': '1',
		success_url: `${origin}/profile?billing=success`,
		cancel_url: `${origin}/profile?billing=canceled`,
		client_reference_id: user.id,
		'metadata[userId]': user.id,
		'subscription_data[metadata][userId]': user.id,
		allow_promotion_codes: 'true',
	})

	if (user.stripeCustomerId) {
		form.set('customer', user.stripeCustomerId)
	} else if (user.email) {
		form.set('customer_email', user.email)
	}

	const session = await stripeRequest<StripeCheckoutSession>(
		c.env.STRIPE_API_KEY,
		'/checkout/sessions',
		{
			method: 'POST',
			body: form,
			headers: {'Content-Type': 'application/x-www-form-urlencoded'},
		},
	)

	if (!session.url) {
		return c.json({error: 'Stripe did not return a checkout URL'}, 502)
	}

	await db
		.update(schema.users)
		.set({
			stripePriceId: c.env.STRIPE_PRO_PRICE_ID,
			subscriptionUpdatedAt: new Date(),
			updatedAt: new Date(),
		})
		.where(eq(schema.users.id, user.id))

	return c.json({url: session.url})
})

billingRouter.post('/webhook', async c => {
	if (!c.env.STRIPE_WEBHOOK_SECRET) {
		return c.json({error: 'Missing STRIPE_WEBHOOK_SECRET'}, 500)
	}

	if (!c.env.STRIPE_API_KEY) {
		return c.json({error: 'Missing STRIPE_API_KEY'}, 500)
	}

	const signature = c.req.header('Stripe-Signature')
	if (!signature) {
		return c.json({error: 'Missing Stripe-Signature header'}, 400)
	}

	const payload = await c.req.text()
	const isValid = await verifyStripeSignature(
		payload,
		signature,
		c.env.STRIPE_WEBHOOK_SECRET,
	)

	if (!isValid) {
		return c.json({error: 'Invalid Stripe signature'}, 400)
	}

	const event = JSON.parse(payload) as StripeEvent
	const db = createDb(c.env.DB)

	switch (event.type) {
		case 'checkout.session.completed': {
			const session = event.data.object
			const subscriptionId = asString(session.subscription)
			if (!subscriptionId) break
			const userId =
				asString(session.client_reference_id) ??
				asRecord(session.metadata)?.userId ??
				undefined
			const subscription = await fetchStripeSubscription(
				c.env.STRIPE_API_KEY,
				subscriptionId,
			)
			await syncSubscriptionRecord(db, subscription, userId)
			break
		}
		case 'customer.subscription.created':
		case 'customer.subscription.updated':
		case 'customer.subscription.deleted': {
			await syncSubscriptionRecord(db, event.data.object as StripeSubscription)
			break
		}
		case 'invoice.payment_failed': {
			const invoice = event.data.object
			const subscriptionId = asString(invoice.subscription)
			if (!subscriptionId) break
			const subscription = await fetchStripeSubscription(
				c.env.STRIPE_API_KEY,
				subscriptionId,
			)
			await syncSubscriptionRecord(db, subscription)
			break
		}
	}

	return c.json({received: true})
})

async function syncSubscriptionRecord(
	db: ReturnType<typeof createDb>,
	subscription: StripeSubscription,
	fallbackUserId?: string,
) {
	const {schema} = await import('@happy-vibecode/db')
	const userId =
		subscription.metadata?.userId ??
		fallbackUserId ??
		(await findUserIdForSubscription(db, subscription))

	if (!userId) {
		return
	}

	const currentPeriodEnd = unixSecondsToDate(subscription.current_period_end)
	const now = new Date()
	const entitlementActive =
		subscription.status !== 'inactive' &&
		(subscription.status !== 'canceled' ||
			(currentPeriodEnd !== null && currentPeriodEnd > now))

	await db
		.update(schema.users)
		.set({
			planTier: entitlementActive ? 'pro' : 'free',
			subscriptionStatus: subscription.status,
			stripeCustomerId: subscription.customer,
			stripeSubscriptionId: subscription.id,
			stripePriceId: subscription.items?.data?.[0]?.price?.id ?? null,
			subscriptionCurrentPeriodEnd: currentPeriodEnd,
			subscriptionCancelAtPeriodEnd: subscription.cancel_at_period_end,
			subscriptionUpdatedAt: now,
			updatedAt: now,
		})
		.where(eq(schema.users.id, userId))
}

async function findUserIdForSubscription(
	db: ReturnType<typeof createDb>,
	subscription: StripeSubscription,
) {
	const userBySubscriptionId = await db.query.users.findFirst({
		where: (u, {eq}) => eq(u.stripeSubscriptionId, subscription.id),
	})
	if (userBySubscriptionId) return userBySubscriptionId.id

	if (subscription.customer) {
		const userByCustomerId = await db.query.users.findFirst({
			where: (u, {eq}) => eq(u.stripeCustomerId, subscription.customer!),
		})
		if (userByCustomerId) return userByCustomerId.id
	}

	return undefined
}

async function fetchStripeSubscription(apiKey: string, subscriptionId: string) {
	return stripeRequest<StripeSubscription>(
		apiKey,
		`/subscriptions/${subscriptionId}`,
	)
}

async function stripeRequest<T>(
	apiKey: string,
	path: string,
	init: RequestInit = {},
) {
	const response = await fetch(`https://api.stripe.com/v1${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${apiKey}`,
			...init.headers,
		},
	})

	if (!response.ok) {
		throw new Error(
			`Stripe request failed: ${response.status} ${response.statusText}`,
		)
	}

	return (await response.json()) as T
}

async function verifyStripeSignature(
	payload: string,
	signatureHeader: string,
	webhookSecret: string,
) {
	const parts = signatureHeader.split(',').map(part => part.trim())
	const timestamp = parts.find(part => part.startsWith('t='))?.slice(2)
	const signature = parts.find(part => part.startsWith('v1='))?.slice(3)

	if (!timestamp || !signature) {
		return false
	}

	const signedPayload = `${timestamp}.${payload}`
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(webhookSecret),
		{name: 'HMAC', hash: 'SHA-256'},
		false,
		['sign'],
	)
	const digest = await crypto.subtle.sign(
		'HMAC',
		key,
		new TextEncoder().encode(signedPayload),
	)
	const expected = [...new Uint8Array(digest)]
		.map(byte => byte.toString(16).padStart(2, '0'))
		.join('')

	return timingSafeEqual(signature, expected)
}

function timingSafeEqual(left: string, right: string) {
	if (left.length !== right.length) return false
	let mismatch = 0
	for (let i = 0; i < left.length; i += 1) {
		mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i)
	}
	return mismatch === 0
}

function unixSecondsToDate(value: number | null) {
	if (typeof value !== 'number') return null
	return new Date(value * 1000)
}

function asString(value: unknown) {
	return typeof value === 'string' ? value : undefined
}

function asRecord(value: unknown) {
	return value && typeof value === 'object'
		? (value as Record<string, string | undefined>)
		: undefined
}
