'use client'
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	PieChart,
	Pie,
	Cell,
	BarChart,
	Bar,
} from 'recharts'
import {
	CircleIcon,
	DevicesIcon,
	ClockIcon,
	ChatCircleDotsIcon,
	TrendUpIcon,
	CalendarBlankIcon,
} from '@phosphor-icons/react'
import {useEffect, useState, useMemo} from 'react'
import {Empty, Text} from '@cloudflare/kumo'
import {useRouter} from 'next/navigation'
import {useAuth} from '../hooks/useAuth'
import {Nav} from '../components/Nav'

interface Session {
	id: string
	agentType: string
	connectionStatus: string
	startedAt: string
	endedAt?: string
	metadata?: Record<string, unknown>
}

interface SessionsResponse {
	sessions: Session[]
}

const COLORS = [
	'#8b5cf6',
	'#06b6d4',
	'#f59e0b',
	'#ef4444',
	'#22c55e',
	'#ec4899',
	'#6366f1',
	'#14b8a6',
]

function formatDuration(ms: number): string {
	const mins = Math.floor(ms / 60000)
	if (mins < 60) return `${mins}m`
	const hrs = Math.floor(mins / 60)
	const remMins = mins % 60
	if (hrs < 24) return `${hrs}h ${remMins}m`
	const days = Math.floor(hrs / 24)
	return `${days}d ${hrs % 24}h`
}

function getDefaultStartDate(): string {
	return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
		.toISOString()
		.split('T')[0]
}

function getDefaultEndDate(): string {
	return new Date().toISOString().split('T')[0]
}

function DateRangePicker({
	startDate,
	endDate,
	onStartDateChange,
	onEndDateChange,
}: {
	startDate: string
	endDate: string
	onStartDateChange: (d: string) => void
	onEndDateChange: (d: string) => void
}) {
	return (
		<div className="flex items-center gap-3">
			<div>
				<label htmlFor="analytics-start-date" className="sr-only">
					Start Date
				</label>
				<input
					id="analytics-start-date"
					type="date"
					value={startDate}
					onChange={e => onStartDateChange(e.target.value)}
					className="px-3 py-1.5 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default text-sm focus:outline-none focus:ring-2 focus:ring-kumo-ring"
				/>
			</div>
			<span className="text-kumo-inactive text-sm">to</span>
			<div>
				<label htmlFor="analytics-end-date" className="sr-only">
					End Date
				</label>
				<input
					id="analytics-end-date"
					type="date"
					value={endDate}
					onChange={e => onEndDateChange(e.target.value)}
					className="px-3 py-1.5 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default text-sm focus:outline-none focus:ring-2 focus:ring-kumo-ring"
				/>
			</div>
		</div>
	)
}

function StatCard({
	icon,
	label,
	value,
	subValue,
	color,
}: {
	icon: React.ReactNode
	label: string
	value: number | string
	subValue?: string
	color?: string
}) {
	return (
		<div className="bg-kumo-base border border-kumo-line rounded-2xl px-5 py-4 flex items-center gap-4">
			<div className={color ?? 'text-kumo-accent'}>{icon}</div>
			<div>
				<p className="text-2xl font-bold text-kumo-default">{value}</p>
				<p className="text-xs text-kumo-secondary">{label}</p>
				{subValue && <p className="text-xs text-kumo-inactive">{subValue}</p>}
			</div>
		</div>
	)
}

function SkeletonCards() {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			{Array.from({length: 4}).map((_, i) => (
				<div
					key={i}
					className="bg-kumo-base border border-kumo-line rounded-2xl p-5 space-y-3"
				>
					<div className="h-3 bg-kumo-control rounded animate-pulse w-20" />
					<div className="h-8 bg-kumo-control rounded animate-pulse w-32" />
				</div>
			))}
		</div>
	)
}

function SkeletonChart() {
	return (
		<div className="bg-kumo-base border border-kumo-line rounded-2xl p-6 space-y-4">
			<div className="h-4 bg-kumo-control rounded animate-pulse w-40" />
			<div className="h-64 bg-kumo-control/50 rounded animate-pulse" />
		</div>
	)
}

const tooltipStyle = {
	backgroundColor: 'var(--kumo-base, #fff)',
	border: '1px solid var(--kumo-line, #e5e7eb)',
	borderRadius: '8px',
	fontSize: '12px',
}

const axisTickStyle = {
	fontSize: 11,
	fill: 'var(--kumo-secondary, #6b7280)',
}

export default function AnalyticsPage() {
	const {isAuthed, isLoaded, apiToken, logout} = useAuth()
	const router = useRouter()
	const [sessions, setSessions] = useState<Session[]>([])
	const [fetching, setFetching] = useState(true)

	const [startDate, setStartDate] = useState(getDefaultStartDate)
	const [endDate, setEndDate] = useState(getDefaultEndDate)

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

	const filtered = useMemo(() => {
		const start = new Date(startDate).getTime()
		const end = new Date(endDate).getTime() + 86400000
		return sessions.filter(s => {
			const t = new Date(s.startedAt).getTime()
			return t >= start && t <= end
		})
	}, [sessions, startDate, endDate])

	const stats = useMemo(() => {
		if (filtered.length === 0) {
			return {
				totalSessions: 0,
				totalMessages: 0,
				avgDuration: '0m',
				topAgent: 'N/A',
			}
		}

		let totalDuration = 0
		let durationCount = 0
		const agentCounts: Record<string, number> = {}

		for (const s of filtered) {
			agentCounts[s.agentType] = (agentCounts[s.agentType] || 0) + 1
			const start = new Date(s.startedAt).getTime()
			const end = s.endedAt ? new Date(s.endedAt).getTime() : Date.now()
			totalDuration += end - start
			durationCount++
		}

		const topAgent = Object.entries(agentCounts).sort(
			(a, b) => b[1] - a[1],
		)[0][0]

		return {
			totalSessions: filtered.length,
			totalMessages: filtered.reduce((sum, s) => {
				const meta = s.metadata as Record<string, unknown> | undefined
				return (
					sum + (typeof meta?.messageCount === 'number' ? meta.messageCount : 0)
				)
			}, 0),
			avgDuration:
				durationCount > 0
					? formatDuration(totalDuration / durationCount)
					: '0m',
			topAgent,
		}
	}, [filtered])

	const sessionsOverTime = useMemo(() => {
		const counts: Record<string, number> = {}
		for (const s of filtered) {
			const date = s.startedAt.split('T')[0]
			counts[date] = (counts[date] || 0) + 1
		}
		return Object.entries(counts)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([date, count]) => ({date, count}))
	}, [filtered])

	const agentUsage = useMemo(() => {
		const counts: Record<string, number> = {}
		for (const s of filtered) {
			counts[s.agentType] = (counts[s.agentType] || 0) + 1
		}
		return Object.entries(counts)
			.sort((a, b) => b[1] - a[1])
			.map(([agentType, count]) => ({agentType, count}))
	}, [filtered])

	const messagesPerSession = useMemo(() => {
		return filtered
			.slice(0, 10)
			.map(s => {
				const meta = s.metadata as Record<string, unknown> | undefined
				const msgCount =
					typeof meta?.messageCount === 'number' ? meta.messageCount : 0
				return {
					id: s.id.slice(0, 8),
					messages: msgCount,
					agentType: s.agentType,
				}
			})
			.reverse()
	}, [filtered])

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
		<div className="min-h-screen bg-kumo-elevated">
			<Nav onLogout={handleLogout} />

			<main className="max-w-5xl mx-auto px-6 py-10">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
					<div>
						<h1 className="text-2xl font-bold text-kumo-default">
							Session Analytics
						</h1>
						<p className="text-sm text-kumo-secondary mt-1">
							Your session activity and usage metrics
						</p>
					</div>
					<DateRangePicker
						startDate={startDate}
						endDate={endDate}
						onStartDateChange={setStartDate}
						onEndDateChange={setEndDate}
					/>
				</div>

				{fetching ? (
					<>
						<SkeletonCards />
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
							<SkeletonChart />
							<SkeletonChart />
							<SkeletonChart />
						</div>
					</>
				) : filtered.length === 0 ? (
					<div className="bg-kumo-base border border-dashed border-kumo-line rounded-2xl py-16">
						<Empty
							icon={<CalendarBlankIcon size={40} weight="duotone" />}
							title="No sessions in this date range"
							contents={
								<Text variant="secondary">
									Try adjusting the date range or start a new chat session.
								</Text>
							}
						/>
					</div>
				) : (
					<>
						{/* Summary stat cards */}
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
							<StatCard
								icon={<DevicesIcon size={22} weight="duotone" />}
								label="Total Sessions"
								value={stats.totalSessions}
							/>
							<StatCard
								icon={<ChatCircleDotsIcon size={22} weight="duotone" />}
								label="Total Messages"
								value={stats.totalMessages}
							/>
							<StatCard
								icon={<ClockIcon size={22} weight="duotone" />}
								label="Avg Duration"
								value={stats.avgDuration}
							/>
							<StatCard
								icon={<TrendUpIcon size={22} weight="duotone" />}
								label="Top Agent"
								value={stats.topAgent}
								color="text-kumo-success"
							/>
						</div>

						{/* Charts */}
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							{/* Sessions over time */}
							<div className="bg-kumo-base border border-kumo-line rounded-2xl p-6">
								<h3 className="font-semibold text-kumo-default mb-4">
									Sessions Over Time
								</h3>
								<div className="h-64">
									<ResponsiveContainer width="100%" height="100%">
										<LineChart data={sessionsOverTime}>
											<CartesianGrid
												strokeDasharray="3 3"
												stroke="var(--kumo-line, #e5e7eb)"
											/>
											<XAxis dataKey="date" tick={axisTickStyle} />
											<YAxis tick={axisTickStyle} />
											<Tooltip contentStyle={tooltipStyle} />
											<Line
												type="monotone"
												dataKey="count"
												stroke="#8b5cf6"
												strokeWidth={2}
												dot={false}
												name="Sessions"
											/>
										</LineChart>
									</ResponsiveContainer>
								</div>
							</div>

							{/* Agent usage distribution */}
							<div className="bg-kumo-base border border-kumo-line rounded-2xl p-6">
								<h3 className="font-semibold text-kumo-default mb-4">
									Agent Usage
								</h3>
								<div className="h-64">
									<ResponsiveContainer width="100%" height="100%">
										<PieChart>
											<Pie
												data={agentUsage}
												dataKey="count"
												nameKey="agentType"
												cx="50%"
												cy="50%"
												outerRadius={80}
												label={({
													agentType,
													count,
												}: {
													agentType: string
													count: number
												}) => `${agentType}: ${count}`}
												labelLine={false}
												fontSize={11}
											>
												{agentUsage.map((_, i) => (
													<Cell
														key={`cell-${i}`}
														fill={COLORS[i % COLORS.length]}
													/>
												))}
											</Pie>
											<Tooltip contentStyle={tooltipStyle} />
										</PieChart>
									</ResponsiveContainer>
								</div>
							</div>

							{/* Messages per session */}
							<div className="bg-kumo-base border border-kumo-line rounded-2xl p-6 lg:col-span-2">
								<h3 className="font-semibold text-kumo-default mb-4">
									Messages Per Session
								</h3>
								<div className="h-64">
									<ResponsiveContainer width="100%" height="100%">
										<BarChart data={messagesPerSession}>
											<CartesianGrid
												strokeDasharray="3 3"
												stroke="var(--kumo-line, #e5e7eb)"
											/>
											<XAxis dataKey="id" tick={axisTickStyle} />
											<YAxis tick={axisTickStyle} />
											<Tooltip contentStyle={tooltipStyle} />
											<Bar
												dataKey="messages"
												fill="#8b5cf6"
												name="Messages"
												radius={[4, 4, 0, 0]}
											/>
										</BarChart>
									</ResponsiveContainer>
								</div>
							</div>
						</div>
					</>
				)}
			</main>
		</div>
	)
}
