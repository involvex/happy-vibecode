'use client'
import {
	CircleIcon,
	CopyIcon,
	EyeIcon,
	EyeSlashIcon,
	KeyIcon,
	ShieldCheckIcon,
	TrashIcon,
} from '@phosphor-icons/react'
import {Button, Text} from '@cloudflare/kumo'
import {useRouter} from 'next/navigation'
import {useEffect, useState} from 'react'
import {useAuth} from '../hooks/useAuth'
import {Nav} from '../components/Nav'

export default function SettingsPage() {
	const {isAuthed, isLoaded, apiToken, userId, serverUrl, logout} = useAuth()
	const router = useRouter()
	const [showToken, setShowToken] = useState(false)
	const [copied, setCopied] = useState(false)
	const [rotating, setRotating] = useState(false)
	const [rotateError, setRotateError] = useState('')
	const [rotateSuccess, setRotateSuccess] = useState('')

	useEffect(() => {
		if (isLoaded && !isAuthed) {
			router.replace('/login')
		}
	}, [isLoaded, isAuthed, router])

	const handleCopy = () => {
		if (!apiToken) return
		navigator.clipboard.writeText(apiToken)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	const handleRotate = async () => {
		if (!apiToken) return
		setRotating(true)
		setRotateError('')
		setRotateSuccess('')
		try {
			const res = await fetch('/api/auth/rotate', {
				method: 'POST',
				headers: {Authorization: `Bearer ${apiToken}`},
			})
			if (!res.ok) {
				const data = (await res.json()) as {error?: string}
				throw new Error(data.error ?? 'Failed to rotate token')
			}
			const data = (await res.json()) as {apiToken: string}
			// Update localStorage directly without re-triggering useEffect login
			localStorage.setItem('happy-api-token', data.apiToken)
			setRotateSuccess(
				"Token rotated! Copy your new token — it won't be shown again.",
			)
			setShowToken(true)
		} catch (err) {
			setRotateError((err as Error).message)
		} finally {
			setRotating(false)
		}
	}

	const handleLogout = () => {
		logout()
		router.replace('/login')
	}

	if (!isLoaded || !isAuthed) {
		return (
			<div className="flex items-center justify-center h-screen bg-kumo-elevated">
				<CircleIcon
					size={32}
					weight="duotone"
					className="text-kumo-inactive animate-spin"
				/>
			</div>
		)
	}

	const maskedToken = apiToken
		? `${apiToken.slice(0, 8)}${'•'.repeat(24)}${apiToken.slice(-4)}`
		: ''

	return (
		<div className="min-h-screen bg-kumo-elevated">
			<Nav onLogout={handleLogout} />

			<main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
				<h1 className="text-2xl font-bold text-kumo-default">Settings</h1>

				{/* Account */}
				<section className="bg-kumo-base border border-kumo-line rounded-2xl p-6 space-y-4">
					<div className="flex items-center gap-2 text-kumo-default font-semibold">
						<ShieldCheckIcon size={18} weight="duotone" />
						Account
					</div>
					<div className="text-sm space-y-1">
						<p className="text-kumo-secondary">User ID</p>
						<p className="font-mono text-kumo-default text-sm">{userId}</p>
					</div>
				</section>

				{/* API Token */}
				<section className="bg-kumo-base border border-kumo-line rounded-2xl p-6 space-y-4">
					<div className="flex items-center gap-2 text-kumo-default font-semibold">
						<KeyIcon size={18} weight="duotone" />
						API Token
					</div>

					<div className="flex items-center gap-2">
						<div className="flex-1 font-mono text-sm bg-kumo-control rounded-lg px-3 py-2 text-kumo-default overflow-hidden text-ellipsis whitespace-nowrap">
							{showToken ? apiToken : maskedToken}
						</div>
						<button
							onClick={() => setShowToken(v => !v)}
							className="p-2 rounded-lg hover:bg-kumo-hover text-kumo-secondary transition-colors"
							title={showToken ? 'Hide' : 'Show'}
						>
							{showToken ? <EyeSlashIcon size={16} /> : <EyeIcon size={16} />}
						</button>
						<button
							onClick={handleCopy}
							className="p-2 rounded-lg hover:bg-kumo-hover text-kumo-secondary transition-colors"
							title="Copy"
						>
							<CopyIcon size={16} />
						</button>
					</div>

					{copied && (
						<p className="text-xs text-kumo-success">Copied to clipboard!</p>
					)}
					{rotateError && (
						<p className="text-xs text-kumo-danger">{rotateError}</p>
					)}
					{rotateSuccess && (
						<p className="text-xs text-kumo-success">{rotateSuccess}</p>
					)}

					<div className="pt-2 flex items-center gap-3">
						<Button
							variant="secondary"
							size="sm"
							onClick={handleRotate}
							disabled={rotating}
						>
							{rotating ? 'Rotating…' : 'Rotate Token'}
						</Button>
					</div>

					<div className="text-xs text-kumo-inactive bg-kumo-control rounded-lg px-3 py-2">
						Use this token in the CLI:{' '}
						<code className="text-kumo-accent">happy login</code>, or set it in
						your HTTP requests as{' '}
						<code className="text-kumo-accent">
							Authorization: Bearer {'<token>'}
						</code>
					</div>
				</section>

				{/* Server */}
				{serverUrl && (
					<section className="bg-kumo-base border border-kumo-line rounded-2xl p-6 space-y-4">
						<div className="flex items-center gap-2 text-kumo-default font-semibold">
							Server URL
						</div>
						<p className="font-mono text-sm text-kumo-default">
							{serverUrl || window.location.origin}
						</p>
					</section>
				)}

				{/* Danger zone */}
				<section className="bg-kumo-base border border-kumo-danger/30 rounded-2xl p-6 space-y-4">
					<div className="flex items-center gap-2 text-kumo-danger font-semibold">
						<TrashIcon size={18} weight="duotone" />
						Danger Zone
					</div>
					<Text size="sm" variant="secondary">
						Logging out will remove your credentials from this browser.
					</Text>
					<Button variant="destructive" size="sm" onClick={handleLogout}>
						Sign Out
					</Button>
				</section>
			</main>
		</div>
	)
}
