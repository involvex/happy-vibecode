'use client'
import {
	ArrowClockwiseIcon,
	CircleIcon,
	ChatCircleDotsIcon,
	ClockIcon,
	DevicesIcon,
	WifiHighIcon,
} from '@phosphor-icons/react'
import {useCallback, useEffect, useState} from 'react'
import {Button, Text} from '@cloudflare/kumo'
import {useRouter} from 'next/navigation'
import {useAuth} from '../hooks/useAuth'
import {Nav} from '../components/Nav'
import Link from 'next/link'

interface Session {
	id: string
	agentType: string
	status: string
	createdAt: string
	updatedAt: string
}

interface SessionsResponse {
	sessions: Session[]
}

function StatusDot({status}: {status: string}) {
	const isActive = status === 'active'
	return (
		<span
			className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
				isActive
					? 'bg-kumo-success/15 text-kumo-success'
					: 'bg-kumo-control text-kumo-secondary'
			}`}
		>
			<CircleIcon
				size={6}
				weight="fill"
				className={isActive ? 'text-kumo-success' : 'text-kumo-inactive'}
			/>
			{status}
		</span>
	)
}

function SessionCard({session}: {session: Session}) {
	const timeAgo = (iso: string) => {
		const diff = Date.now() - new Date(iso).getTime()
		const mins = Math.floor(diff / 60000)
		if (mins < 1) return 'just now'
		if (mins < 60) return `${mins}m ago`
		const hrs = Math.floor(mins / 60)
		if (hrs < 24) return `${hrs}h ago`
		return `${Math.floor(hrs / 24)}d ago`
	}

	return (
		<div className="flex flex-col gap-3 p-5 border bg-kumo-base border-kumo-line rounded-2xl">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="font-semibold capitalize truncate text-kumo-default">
						{session.agentType.replace('_', ' ')}
					</p>
					<p className="text-xs text-kumo-inactive font-mono mt-0.5 truncate">
						{session.id}
					</p>
				</div>
				<StatusDot status={session.status} />
			</div>
			<div className="flex items-center gap-1.5 text-xs text-kumo-secondary">
				<ClockIcon size={12} />
				Updated {timeAgo(session.updatedAt)}
			</div>
			<div className="flex gap-2 pt-1">
				<Link href={`/chat?room=${session.id}`} className="flex-1">
					<Button variant="primary" size="sm" className="w-full">
						<ChatCircleDotsIcon size={14} />
						Open Chat
					</Button>
				</Link>
			</div>
		</div>
	)
}

export default function DashboardPage() {
	const {isAuthed, isLoaded, apiToken, userId, logout} = useAuth()
	const router = useRouter()
	const [sessions, setSessions] = useState<Session[]>([])
	const [fetching, setFetching] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const loadSessions = useCallback(async () => {
		if (!apiToken) {
			setSessions([])
			setFetching(false)
			setError(null)
			return
		}

		setFetching(true)
		setError(null)

		try {
			const res = await fetch('/api/sessions', {
				headers: {Authorization: `Bearer ${apiToken}`},
			})

			if (!res.ok) {
				setSessions([])
				setError(`Failed to load sessions (status ${res.status})`)
				return
			}

			const data = (await res.json()) as SessionsResponse
			setSessions(data.sessions ?? [])
		} catch (err) {
			console.error('Error loading sessions', err)
			setSessions([])
			setError('Failed to load sessions')
		} finally {
			setFetching(false)
		}
	}, [apiToken])

	useEffect(() => {
		if (isLoaded && !isAuthed) {
			router.replace('/login')
		}
	}, [isLoaded, isAuthed, router])

	useEffect(() => {
		loadSessions()
	}, [loadSessions])

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

	const activeSessions = sessions.filter(s => s.status === 'active')

	return (
		<div className="min-h-screen bg-kumo-elevated">
			<Nav onLogout={handleLogout} />

			<main className="max-w-5xl px-4 py-6 mx-auto sm:px-6 sm:py-10">
				{/* Summary cards */}
				<div className="grid grid-cols-2 gap-4 mb-10 lg:grid-cols-4">
					{[
						{
							icon: <DevicesIcon size={22} weight="duotone" />,
							label: 'Total sessions',
							value: sessions.length,
						},
						{
							icon: (
								<WifiHighIcon
									size={22}
									weight="duotone"
									className="text-kumo-success"
								/>
							),
							label: 'Active',
							value: activeSessions.length,
						},
						{
							icon: <ClockIcon size={22} weight="duotone" />,
							label: 'Closed',
							value: sessions.length - activeSessions.length,
						},
					].map(card => (
						<div
							key={card.label}
							className="flex items-center gap-4 px-5 py-4 border bg-kumo-base border-kumo-line rounded-2xl"
						>
							<div className="text-kumo-accent">{card.icon}</div>
							<div>
								<p className="text-2xl font-bold text-kumo-default">
									{card.value}
								</p>
								<p className="text-xs text-kumo-secondary">{card.label}</p>
							</div>
						</div>
					))}
				</div>

				{/* Sessions list */}
				<div className="flex items-center justify-between gap-2 mb-5">
					<h2 className="text-xl font-bold text-kumo-default">
						Agent Sessions
					</h2>
					<div className="flex items-center gap-2">
						<Button
							variant="secondary"
							size="sm"
							onClick={loadSessions}
							disabled={fetching}
							aria-label="Refresh sessions"
						>
							<ArrowClockwiseIcon
								size={14}
								className={fetching ? 'animate-spin' : ''}
							/>
						</Button>
						<Link href="/chat">
							<Button variant="primary" size="sm">
								<ChatCircleDotsIcon size={14} />
								New Chat
							</Button>
						</Link>
					</div>
				</div>

				{fetching ? (
					<div className="flex items-center gap-3 py-10 text-kumo-secondary">
						<CircleIcon
							size={18}
							weight="duotone"
							className="animate-spin text-kumo-inactive"
						/>
						Loading sessions…
					</div>
				) : sessions.length === 0 ? (
					<div className="py-16 text-center border border-dashed bg-kumo-base border-kumo-line rounded-2xl">
						<ChatCircleDotsIcon
							size={40}
							weight="duotone"
							className="mx-auto mb-3 text-kumo-inactive"
						/>
						<Text variant="secondary">
							No sessions yet. Start by connecting your local agent.
						</Text>
						<code className="text-sm text-kumo-accent bg-kumo-control px-3 py-1.5 rounded-lg">
							$ happy-vibecode connect gemini
						</code>
					</div>
				) : (
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{sessions.map(s => (
							<SessionCard key={s.id} session={s} />
						))}
					</div>
				)}

				{/* Footer user info */}
				<div className="pt-6 mt-10 font-mono text-xs border-t border-kumo-line text-kumo-inactive">
					User ID: {userId}
				</div>
			</main>
		</div>
	)
}
