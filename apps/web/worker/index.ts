import {handleImageOptimization} from 'vinext/server/image-optimization'
import {createDb, authUser} from '@happy-vibecode/db'
import handler from 'vinext/server/app-router-entry'
import {api} from '@happy-vibecode/api'
import {createAuth} from './auth'
import {eq} from 'drizzle-orm'

export {BridgeAgent} from './bridge-agent'

interface Env {
	ASSETS: Fetcher
	DB: D1Database
	KV: KVNamespace
	BridgeAgent: DurableObjectNamespace
	AUTH_GITHUB_ID: string
	AUTH_GITHUB_SECRET: string
	BETTER_AUTH_SECRET: string
	STRIPE_API_KEY?: string
	STRIPE_WEBHOOK_SECRET?: string
	STRIPE_PRO_PRODUCT_ID?: string
	STRIPE_PRO_PRICE_ID?: string
	STRIPE_PRO_URL?: string
	TURNSTILE_SITE_KEY: string
	TURNSTILE_SECRET_KEY: string
	IMAGES: {
		input(stream: ReadableStream): {
			transform(options: Record<string, unknown>): {
				output(options: {
					format: string
					quality: number
				}): Promise<{response(): Response}>
			}
		}
	}
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url)

		// Image optimization via Cloudflare Images binding
		if (url.pathname === '/_vinext/image') {
			return handleImageOptimization(request, {
				fetchAsset: path =>
					env.ASSETS.fetch(new Request(new URL(path, request.url))),
				transformImage: async (body, {width, format, quality}) => {
					const result = await env.IMAGES.input(body)
						.transform(width > 0 ? {width} : {})
						.output({format, quality})
					return result.response()
				},
			})
		}

		// Better Auth handles all /api/auth/* routes (OAuth, sessions, sign-out, etc.)
		// Falls through to Hono for unrecognised paths (e.g. /api/auth/login, /api/auth/register)
		if (url.pathname.startsWith('/api/auth')) {
			const auth = createAuth(env, request.url)
			const authResponse = await auth.handler(request)
			if (authResponse.status !== 404) return authResponse
		}

		// Turnstile config endpoint (public)
		if (url.pathname === '/api/config/turnstile') {
			return Response.json({siteKey: env.TURNSTILE_SITE_KEY})
		}

		// Mount Hono API at /api/*
		if (url.pathname.startsWith('/api/')) {
			return api.fetch(request, env)
		}

		// Route BridgeAgent WebSocket connections: /agents/BridgeAgent/<roomId>
		if (url.pathname.startsWith('/agents/BridgeAgent/')) {
			const roomId =
				url.pathname.slice('/agents/BridgeAgent/'.length) || 'default'

			// Validate Bearer token before forwarding to Durable Object
			// Accept token from Authorization header (CLI/mobile) or query param (browser WS)
			const authHeader = request.headers.get('Authorization')
			const token = authHeader?.startsWith('Bearer ')
				? authHeader.slice(7)
				: url.searchParams.get('token')
			if (!token) {
				return new Response('Unauthorized', {status: 401})
			}

			const db = createDb(env.DB)
			let userId: string | undefined

			// Fast path: check users table
			const user = await db.query.users.findFirst({
				where: (u, {eq}) => eq(u.apiToken, token),
			})
			if (user) {
				userId = user.id
			} else {
				// Fallback: check auth_user table (Better Auth users)
				const authUserRecord = await db
					.select()
					.from(authUser)
					.where(eq(authUser.apiToken, token))
					.get()
				if (authUserRecord) {
					userId = authUserRecord.id
				}
			}

			if (!userId) {
				return new Response('Unauthorized', {status: 401})
			}

			// Pass authenticated userId to BridgeAgent via trusted header
			const headers = new Headers(request.headers)
			headers.set('X-Authenticated-UserId', userId)

			const authenticatedRequest = new Request(request.url, {
				method: request.method,
				headers,
				body: request.body,
			})

			const id = env.BridgeAgent.idFromName(roomId)
			const stub = env.BridgeAgent.get(id)
			return stub.fetch(authenticatedRequest)
		}

		// Delegate everything else to vinext
		return handler.fetch(request)
	},
}
