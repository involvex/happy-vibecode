'use client'
import {useRouter, useSearchParams} from 'next/navigation'
import {CloudIcon} from '@phosphor-icons/react'
import {Button, Text} from '@cloudflare/kumo'
import {useAuth} from '../hooks/useAuth'
import {Suspense, useState} from 'react'

type Mode = 'login' | 'register'

const OAUTH_ERRORS: Record<string, string> = {
	oauth_denied: 'GitHub sign-in was cancelled.',
	oauth_failed: 'GitHub sign-in failed. Please try again.',
	no_email: 'Your GitHub account has no verified email. Add one and retry.',
}

function LoginForm() {
	const [mode, setMode] = useState<Mode>('login')
	const [email, setEmail] = useState('')
	const [token, setToken] = useState('')
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)
	const {login} = useAuth()
	const router = useRouter()
	const searchParams = useSearchParams()
	const oauthError = searchParams.get('error')

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		setError('')
		setLoading(true)

		try {
			if (mode === 'register') {
				const res = await fetch('/api/auth/register', {
					method: 'POST',
					headers: {'Content-Type': 'application/json'},
					body: JSON.stringify({email}),
				})
				if (!res.ok) {
					const data = (await res.json()) as {error?: string}
					throw new Error(data.error ?? 'Registration failed')
				}
				const data = (await res.json()) as {
					id: string
					apiToken: string
					email: string
				}
				login(data.apiToken, data.id)
				router.push('/dashboard')
			} else {
				// Login with existing token
				const res = await fetch('/api/auth/verify', {
					method: 'POST',
					headers: {Authorization: `Bearer ${token}`},
				})
				if (!res.ok) {
					throw new Error('Invalid token. Please check and try again.')
				}
				const data = (await res.json()) as {valid: boolean; userId: string}
				if (!data.valid) throw new Error('Token verification failed')
				login(token, data.userId)
				router.push('/dashboard')
			}
		} catch (err) {
			setError((err as Error).message)
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="min-h-screen bg-kumo-elevated flex items-center justify-center p-4">
			<div className="w-full max-w-sm">
				{/* Logo */}
				<div className="flex items-center gap-3 justify-center mb-8">
					<CloudIcon size={36} weight="duotone" className="text-kumo-accent" />
					<h1 className="text-2xl font-bold text-kumo-default">
						Happy Vibecode
					</h1>
				</div>

				{/* Card */}
				<div className="bg-kumo-base border border-kumo-line rounded-2xl p-6 shadow-sm">
					{/* GitHub OAuth — primary option */}
					<a
						href="/oauth/github"
						className="flex items-center justify-center gap-2.5 w-full py-2.5 px-4 bg-kumo-control hover:bg-kumo-elevated border border-kumo-line rounded-lg text-kumo-default text-sm font-medium transition-colors mb-4"
					>
						<svg
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="currentColor"
							aria-hidden="true"
						>
							<path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
						</svg>
						Continue with GitHub
					</a>

					{/* Divider */}
					<div className="flex items-center gap-3 mb-4">
						<div className="flex-1 h-px bg-kumo-line" />
						<span className="text-xs text-kumo-inactive">or</span>
						<div className="flex-1 h-px bg-kumo-line" />
					</div>

					{/* OAuth error from redirect */}
					{oauthError && OAUTH_ERRORS[oauthError] && (
						<div className="text-sm text-kumo-danger bg-kumo-danger/10 border border-kumo-danger/20 rounded-lg px-3 py-2 mb-4">
							{OAUTH_ERRORS[oauthError]}
						</div>
					)}

					{/* Tab toggle */}
					<div className="flex rounded-lg bg-kumo-control p-1 mb-6">
						{(['login', 'register'] as const).map(m => (
							<button
								key={m}
								type="button"
								onClick={() => {
									setMode(m)
									setError('')
								}}
								className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
									mode === m
										? 'bg-kumo-base text-kumo-default shadow-sm'
										: 'text-kumo-secondary hover:text-kumo-default'
								}`}
							>
								{m}
							</button>
						))}
					</div>

					<form onSubmit={handleSubmit} className="space-y-4">
						{mode === 'register' ? (
							<div>
								<label className="block text-sm font-medium text-kumo-secondary mb-1.5">
									Email
								</label>
								<input
									type="email"
									value={email}
									onChange={e => setEmail(e.target.value)}
									placeholder="you@example.com"
									required
									className="w-full px-3 py-2 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default placeholder-kumo-inactive focus:outline-none focus:ring-2 focus:ring-kumo-ring focus:border-transparent"
								/>
								<p className="text-xs text-kumo-inactive mt-1">
									We'll generate a secure API token for you.
								</p>
							</div>
						) : (
							<div>
								<label className="block text-sm font-medium text-kumo-secondary mb-1.5">
									API Token
								</label>
								<input
									type="password"
									value={token}
									onChange={e => setToken(e.target.value)}
									placeholder="Paste your token..."
									required
									className="w-full px-3 py-2 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default placeholder-kumo-inactive focus:outline-none focus:ring-2 focus:ring-kumo-ring focus:border-transparent font-mono text-sm"
								/>
								<p className="text-xs text-kumo-inactive mt-1">
									Get your token from{' '}
									<code className="text-kumo-accent">happy login</code> in the
									CLI.
								</p>
							</div>
						)}

						{error && (
							<div className="text-sm text-kumo-danger bg-kumo-danger/10 border border-kumo-danger/20 rounded-lg px-3 py-2">
								{error}
							</div>
						)}

						<Button
							type="submit"
							variant="primary"
							className="w-full"
							disabled={loading}
						>
							{loading
								? 'Please wait...'
								: mode === 'register'
									? 'Create Account'
									: 'Sign In'}
						</Button>
					</form>
				</div>

				<Text size="xs" variant="secondary">
					Need help? Run <code className="text-kumo-accent">happy login</code>{' '}
					in your terminal.
				</Text>
			</div>
		</div>
	)
}

export default function LoginPage() {
	return (
		<Suspense>
			<LoginForm />
		</Suspense>
	)
}
