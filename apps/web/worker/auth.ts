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
						await db
							.insert(users)
							.values({
								id: user.id,
								email: user.email ?? null,
								apiToken: u.apiToken ?? null,
								nickname: user.name ?? null,
								role: (user as typeof user & {role?: string}).role ?? 'user',
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
