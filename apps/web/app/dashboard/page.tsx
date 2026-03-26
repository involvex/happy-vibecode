'use client'
import {
	CircleIcon,
	ChatCircleDotsIcon,
	ClockIcon,
	DevicesIcon,
	WifiHighIcon,
} from '@phosphor-icons/react'
import {Button, Text} from '@cloudflare/kumo'
import {useRouter} from 'next/navigation'
import {useEffect, useState} from 'react'
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
		<div className="bg-kumo-base border border-kumo-line rounded-2xl p-5 flex flex-col gap-3">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="font-semibold text-kumo-default capitalize">
						{session.agentType.replace('_', ' ')}
					</p>
					<p className="text-xs text-kumo-inactive font-mono mt-0.5">
						{session.id.slice(0, 12)}…
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

	useEffect(() => {
		if (isLoaded && !isAuthed) {
			router.replace('/login')
		}
	}, [isLoaded, isAuthed, router])

	useEffect(() => {
		if (!apiToken) return
		async function load() {
			setFetching(true)
			try {
				const res = await fetch('/api/sessions', {
					headers: {Authorization: `Bearer ${apiToken}`},
				})
				if (res.ok) {
					const data = (await res.json()) as SessionsResponse
					setSessions(data.sessions ?? [])
				}
			} finally {
				setFetching(false)
			}
		}
		load()
	}, [apiToken])

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

			<main className="max-w-5xl mx-auto px-6 py-10">
				{/* Summary cards */}
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
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
							className="bg-kumo-base border border-kumo-line rounded-2xl px-5 py-4 flex items-center gap-4"
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
				<div className="flex items-center justify-between mb-5">
					<h2 className="text-xl font-bold text-kumo-default">
						Agent Sessions
					</h2>
					<Link href="/chat">
						<Button variant="primary" size="sm">
							<ChatCircleDotsIcon size={14} />
							New Chat
						</Button>
					</Link>
				</div>

				{fetching ? (
					<div className="flex items-center gap-3 text-kumo-secondary py-10">
						<CircleIcon
							size={18}
							weight="duotone"
							className="animate-spin text-kumo-inactive"
						/>
						Loading sessions…
					</div>
				) : sessions.length === 0 ? (
					<div className="bg-kumo-base border border-dashed border-kumo-line rounded-2xl py-16 text-center">
						<ChatCircleDotsIcon
							size={40}
							weight="duotone"
							className="text-kumo-inactive mx-auto mb-3"
						/>
						<Text variant="secondary">
							No sessions yet. Start by connecting your local agent.
						</Text>
						<code className="text-sm text-kumo-accent bg-kumo-control px-3 py-1.5 rounded-lg">
							$ happy connect gemini
						</code>
					</div>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						{sessions.map(s => (
							<SessionCard key={s.id} session={s} />
						))}
					</div>
				)}

				{/* Footer user info */}
				<div className="mt-10 pt-6 border-t border-kumo-line text-xs text-kumo-inactive font-mono">
					User ID: {userId}
				</div>
			</main>
		</div>
	)
}
