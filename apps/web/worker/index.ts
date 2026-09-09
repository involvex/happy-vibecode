import {api} from '@happy-vibecode/api'
import {authUser, createDb} from '@happy-vibecode/db'
import {eq} from 'drizzle-orm'
import handler from 'vinext/server/app-router-entry'
import {handleImageOptimization} from 'vinext/server/image-optimization'
import {createAuth} from './auth'

export {BridgeAgent} from './bridge-agent'

const SECURITY_HEADERS = {
	'X-Frame-Options': 'DENY',
	'X-Content-Type-Options': 'nosniff',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
	'Content-Security-Policy':
		"default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: https: https://challenges.cloudflare.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
}

function withSecurityHeaders(response: Response): Response {
	const headers = new Headers(response.headers)
	for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
		headers.set(key, value)
	}
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	})
}

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
			if (authResponse.status !== 404) return withSecurityHeaders(authResponse)
		}

		// Turnstile config endpoint (public)
		if (url.pathname === '/api/config/turnstile') {
			return withSecurityHeaders(
				Response.json({siteKey: env.TURNSTILE_SITE_KEY}),
			)
		}

		// Mount Hono API at /api/*
		if (url.pathname.startsWith('/api/')) {
			const auth = createAuth(env, request.url)
			try {
				const session = await auth.api.getSession({
					headers: request.headers,
				})
				if (session?.user?.id) {
					const headers = new Headers(request.headers)
					headers.set('X-Authenticated-UserId', session.user.id)
					const authenticatedRequest = new Request(request.url, {
						method: request.method,
						headers,
						body: request.body,
						// @ts-expect-error duplex is needed for WebSocket upgrade
						duplex: 'half',
					})
					const apiResponse = await api.fetch(authenticatedRequest, env)
					return withSecurityHeaders(apiResponse)
				}
			} catch {
				// Session validation failed; fall through to token auth
			}
			const apiResponse = await api.fetch(request, env)
			return withSecurityHeaders(apiResponse)
		}

		// Route BridgeAgent WebSocket connections: /agents/BridgeAgent/<roomId>
		if (url.pathname.startsWith('/agents/BridgeAgent/')) {
			const roomId =
				url.pathname.slice('/agents/BridgeAgent/'.length) || 'default'

			const db = createDb(env.DB)
			let userId: string | undefined

			// Method 1: Better Auth session cookie (browser clients already logged in)
			// Browser WebSocket upgrades carry cookies automatically — no token needed.
			try {
				const auth = createAuth(env, request.url)
				const session = await auth.api.getSession({
					headers: request.headers,
				})
				if (session?.user?.id) {
					userId = session.user.id
				}
			} catch {
				// Session validation failed; fall through to token auth
			}

			// Method 2: API token (CLI / mobile — Bearer header or ?token= query param)
			if (!userId) {
				const authHeader = request.headers.get('Authorization')
				const token = authHeader?.startsWith('Bearer ')
					? authHeader.slice(7)
					: url.searchParams.get('token')

				if (token) {
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
				}
			}

			if (!userId) {
				return withSecurityHeaders(new Response('Unauthorized', {status: 401}))
			}

			// Pass authenticated userId to BridgeAgent via trusted header
			const headers = new Headers(request.headers)
			headers.set('X-Authenticated-UserId', userId)

			// Use original request with added header for WebSocket upgrade passthrough.
			// duplex: 'half' is required for Cloudflare Workers WebSocket upgrades.
			const authenticatedRequest = new Request(request.url, {
				method: request.method,
				headers,
				body: request.body,
				// @ts-expect-error duplex is needed for WebSocket upgrade
				duplex: 'half',
			})

			console.log(
				'[Worker] Forwarding to BridgeAgent:',
				'roomId:',
				roomId,
				'userId:',
				userId,
				'url:',
				request.url,
			)

			const id = env.BridgeAgent.idFromName(roomId)
			const stub = env.BridgeAgent.get(id)
			return stub.fetch(authenticatedRequest)
		}

		// Delegate everything else to vinext
		const response = await handler.fetch(request)
		return withSecurityHeaders(response)
	},
}
