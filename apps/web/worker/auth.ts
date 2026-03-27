import {
	createDb,
	authUser,
	authSession,
	authAccount,
	authVerification,
	users,
} from '@happy-vibecode/db'
import {drizzleAdapter} from 'better-auth/adapters/drizzle'
import {expo} from '@better-auth/expo'
import {betterAuth} from 'better-auth'
import {eq} from 'drizzle-orm'

export interface AuthEnv {
	DB: D1Database
	AUTH_GITHUB_ID: string
	AUTH_GITHUB_SECRET: string
	BETTER_AUTH_SECRET: string
}

export function createAuth(env: AuthEnv, requestUrl?: string) {
	const baseURL = requestUrl
		? (() => {
				const u = new URL(requestUrl)
				return `${u.protocol}//${u.host}`
			})()
		: 'https://happy-vibecode.involvex.workers.dev'

	const db = createDb(env.DB)

	return betterAuth({
		baseURL,
		basePath: '/api/auth',
		secret: env.BETTER_AUTH_SECRET,
		trustedProxies: ['127.0.0.0/8'],
		database: drizzleAdapter(db, {
			provider: 'sqlite',
			schema: {
				user: authUser,
				session: authSession,
				account: authAccount,
				verification: authVerification,
			},
		}),
		socialProviders: {
			github: {
				clientId: env.AUTH_GITHUB_ID,
				clientSecret: env.AUTH_GITHUB_SECRET,
			},
		},
		plugins: [expo()],
		trustedOrigins: ['happy-vibecode://'],
		user: {
			additionalFields: {
				role: {
					type: 'string',
					defaultValue: 'user',
				},
				apiToken: {
					type: 'string',
					input: false,
				},
			},
		},
		databaseHooks: {
			user: {
				create: {
					before: async userData => {
						const bytes = new Uint8Array(32)
						crypto.getRandomValues(bytes)
						const apiToken = Array.from(bytes)
							.map(b => b.toString(16).padStart(2, '0'))
							.join('')
						return {data: {...userData, apiToken}}
					},
					after: async user => {
						const now = new Date()
						const u = user as typeof user & {apiToken?: string}
						const role = (user as typeof user & {role?: string}).role ?? 'user'

						if (user.email) {
							// Check for a legacy users row with this email but different id
							const existing = await db.query.users.findFirst({
								where: (usr, {eq}) => eq(usr.email, user.email!),
							})
							if (existing) {
								// Sync the Better Auth apiToken onto the existing row so
								// the Bearer-token fast-path resolves the correct user id
								await db
									.update(users)
									.set({apiToken: u.apiToken ?? null, updatedAt: now})
									.where(eq(users.id, existing.id))
								return
							}
						}

						// No pre-existing row — create one for this Better Auth user
						await db
							.insert(users)
							.values({
								id: user.id,
								email: user.email ?? null,
								apiToken: u.apiToken ?? null,
								nickname: user.name ?? null,
								role,
								createdAt: now,
								updatedAt: now,
							})
							.onConflictDoNothing()
					},
				},
			},
		},
	})
}
