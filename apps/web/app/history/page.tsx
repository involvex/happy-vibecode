'use client'
import {
	ChatCircleDotsIcon,
	CircleIcon,
	ClockIcon,
	ArrowSquareOutIcon,
	MagnifyingGlassIcon,
} from '@phosphor-icons/react'
import {Text, Button, Empty} from '@cloudflare/kumo'
import {useRouter} from 'next/navigation'
import {useEffect, useState} from 'react'
import {useAuth} from '../hooks/useAuth'
import {Nav} from '../components/Nav'

interface Message {
	id: string
	role: string
	content: string
	createdAt: string
}

interface Session {
	id: string
	agentType: string
	status: string
	createdAt: string
	updatedAt: string
	messages?: Message[]
}

function formatRelative(dateStr: string) {
	const diff = Date.now() - new Date(dateStr).getTime()
	const mins = Math.floor(diff / 60_000)
	if (mins < 1) return 'just now'
	if (mins < 60) return `${mins}m ago`
	const hrs = Math.floor(mins / 60)
	if (hrs < 24) return `${hrs}h ago`
	const days = Math.floor(hrs / 24)
	if (days < 7) return `${days}d ago`
	return new Date(dateStr).toLocaleDateString()
}

function SessionCard({session}: {session: Session}) {
	const router = useRouter()
	const preview =
		session.messages?.find(m => m.role === 'user')?.content ?? 'No messages yet'

	return (
		<div className="bg-kumo-base border border-kumo-line rounded-2xl p-5 flex flex-col gap-3 hover:border-kumo-accent transition-colors">
			<div className="flex items-start justify-between gap-3">
				<div className="flex-1 min-w-0">
					<p className="font-semibold text-kumo-default truncate">
						{session.agentType ?? 'Unknown agent'}
					</p>
					<p className="text-xs text-kumo-secondary truncate mt-0.5">
						{preview}
					</p>
				</div>
				<span
					className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
						session.status === 'active'
							? 'bg-kumo-success/15 text-kumo-success'
							: 'bg-kumo-control text-kumo-secondary'
					}`}
				>
					{session.status}
				</span>
			</div>

			<div className="flex items-center justify-between">
				<span className="flex items-center gap-1.5 text-xs text-kumo-secondary">
					<ClockIcon size={13} />
					{formatRelative(session.createdAt)}
				</span>
				<Button
					size="sm"
					variant="outline"
					icon={<ArrowSquareOutIcon size={14} />}
					onClick={() => router.push(`/chat?room=${session.id}`)}
				>
					Open
				</Button>
			</div>
		</div>
	)
}

export default function HistoryPage() {
	const {isAuthed, isLoaded, apiToken, serverUrl, logout} = useAuth()
	const router = useRouter()
	const [sessions, setSessions] = useState<Session[]>([])
	const [loading, setLoading] = useState(true)
	const [query, setQuery] = useState('')

	useEffect(() => {
		if (isLoaded && !isAuthed) {
			router.replace('/login')
		}
	}, [isLoaded, isAuthed, router])

	useEffect(() => {
		if (!isAuthed || !apiToken) return
		const base = serverUrl ?? ''
		fetch(`${base}/api/sessions`, {
			headers: {Authorization: `Bearer ${apiToken}`},
		})
			.then(r => (r.ok ? r.json() : Promise.reject(r)))
			.then((data: unknown) => {
				const d = data as {sessions: Session[]}
				setSessions(d.sessions ?? [])
			})
			.catch(() => {
				setSessions([])
			})
			.finally(() => setLoading(false))
	}, [isAuthed, apiToken, serverUrl])

	const filtered = sessions.filter(s => {
		if (!query) return true
		const q = query.toLowerCase()
		return (
			s.agentType?.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
		)
	})

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

	return (
		<div className="min-h-screen bg-kumo-elevated flex flex-col">
			<Nav onLogout={logout} />

			<main className="flex-1 max-w-4xl mx-auto w-full px-5 py-10">
				<div className="flex items-center justify-between mb-8">
					<div>
						<h1 className="text-2xl font-bold text-kumo-default">
							Session History
						</h1>
						<Text variant="secondary" size="sm">
							Browse and resume past agent sessions
						</Text>
					</div>
				</div>

				{/* Search */}
				<div className="relative mb-6">
					<MagnifyingGlassIcon
						size={16}
						className="absolute left-3 top-1/2 -translate-y-1/2 text-kumo-inactive"
					/>
					<input
						type="text"
						placeholder="Search by agent or session ID…"
						value={query}
						onChange={e => setQuery(e.target.value)}
						className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-kumo-line bg-kumo-base text-sm text-kumo-default placeholder:text-kumo-inactive focus:outline-none focus:ring-2 focus:ring-kumo-ring"
					/>
				</div>

				{loading ? (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						{Array.from({length: 6}).map((_, i) => (
							<div
								key={i}
								className="h-36 rounded-2xl bg-kumo-control animate-pulse"
							/>
						))}
					</div>
				) : filtered.length === 0 ? (
					<Empty
						icon={<ChatCircleDotsIcon size={32} />}
						title={query ? 'No sessions match your search' : 'No sessions yet'}
						contents={
							!query ? (
								<Button
									variant="primary"
									size="sm"
									onClick={() => router.push('/chat')}
								>
									Start your first session
								</Button>
							) : undefined
						}
					/>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						{filtered.map(s => (
							<SessionCard key={s.id} session={s} />
						))}
					</div>
				)}
			</main>
		</div>
	)
}
