const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize'
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'
const GITHUB_USER_URL = 'https://api.github.com/user'
const GITHUB_EMAILS_URL = 'https://api.github.com/user/emails'
const CALLBACK_URL =
	'https://happy-vibecode.involvex.workers.dev/oauth/callback'

export interface OAuthEnv {
	DB: D1Database
	GITHUB_CLIENT_ID: string
	GITHUB_CLIENT_SECRET: string
}

interface GithubUser {
	id: number
	login: string
	email: string | null
}

interface GithubEmail {
	email: string
	primary: boolean
	verified: boolean
}

export function handleGithubLogin(env: OAuthEnv): Response {
	const params = new URLSearchParams({
		client_id: env.GITHUB_CLIENT_ID,
		redirect_uri: CALLBACK_URL,
		scope: 'user:email',
	})
	return Response.redirect(`${GITHUB_AUTHORIZE_URL}?${params}`, 302)
}

export async function handleGithubCallback(
	request: Request,
	env: OAuthEnv,
): Promise<Response> {
	const url = new URL(request.url)
	const code = url.searchParams.get('code')
	const error = url.searchParams.get('error')

	if (error || !code) {
		return Response.redirect(`${url.origin}/login?error=oauth_denied`, 302)
	}

	// Exchange code for access token
	const tokenRes = await fetch(GITHUB_TOKEN_URL, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			'User-Agent': 'happy-vibecode',
		},
		body: JSON.stringify({
			client_id: env.GITHUB_CLIENT_ID,
			client_secret: env.GITHUB_CLIENT_SECRET,
			code,
			redirect_uri: CALLBACK_URL,
		}),
	})
	const tokenData = (await tokenRes.json()) as {
		access_token?: string
		error?: string
	}

	if (!tokenData.access_token) {
		return Response.redirect(`${url.origin}/login?error=oauth_failed`, 302)
	}

	const ghHeaders = {
		Authorization: `Bearer ${tokenData.access_token}`,
		'User-Agent': 'happy-vibecode',
	}

	// Fetch GitHub user
	const ghUser = (await (
		await fetch(GITHUB_USER_URL, {headers: ghHeaders})
	).json()) as GithubUser

	// Get primary verified email if not public
	let email = ghUser.email
	if (!email) {
		const emails = (await (
			await fetch(GITHUB_EMAILS_URL, {headers: ghHeaders})
		).json()) as GithubEmail[]
		email =
			emails.find(e => e.primary && e.verified)?.email ??
			emails[0]?.email ??
			null
	}
	if (!email) {
		return Response.redirect(`${url.origin}/login?error=no_email`, 302)
	}

	const githubId = `github:${ghUser.id}`
	const now = Date.now()

	// Find existing user by github_id or email
	const existing = await env.DB.prepare(
		'SELECT id, api_token FROM users WHERE github_id = ? OR email = ? LIMIT 1',
	)
		.bind(githubId, email)
		.first<{id: string; api_token: string}>()

	let userId: string
	let apiToken: string

	if (existing) {
		userId = existing.id
		apiToken = existing.api_token
		// Link github_id if not already linked (e.g. signed up with email first)
		await env.DB.prepare(
			'UPDATE users SET github_id = ?, updated_at = ? WHERE id = ?',
		)
			.bind(githubId, now, userId)
			.run()
	} else {
		userId = crypto.randomUUID()
		apiToken =
			crypto.randomUUID().replace(/-/g, '') +
			crypto.randomUUID().replace(/-/g, '')
		await env.DB.prepare(
			'INSERT INTO users (id, email, api_token, github_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
		)
			.bind(userId, email, apiToken, githubId, now, now)
			.run()
	}

	return Response.redirect(
		`${url.origin}/auth/callback?token=${encodeURIComponent(apiToken)}&userId=${encodeURIComponent(userId)}`,
		302,
	)
}
