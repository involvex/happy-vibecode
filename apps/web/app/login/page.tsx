'use client'
import {CloudIcon} from '@phosphor-icons/react'
import {Button, Text} from '@cloudflare/kumo'
import {useRouter} from 'next/navigation'
import {useAuth} from '../hooks/useAuth'
import {useState} from 'react'

type Mode = 'login' | 'register'

export default function LoginPage() {
	const [mode, setMode] = useState<Mode>('login')
	const [email, setEmail] = useState('')
	const [token, setToken] = useState('')
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)
	const {login} = useAuth()
	const router = useRouter()

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
