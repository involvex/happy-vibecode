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
	Legend,
} from 'recharts'
import {
	UsersIcon,
	WifiHighIcon,
	ChartLineUpIcon,
	DevicesIcon,
} from '@phosphor-icons/react'
import {
	ExportButton,
	exportToCSV,
	exportToPDF,
} from '../components/ExportButton'
import {SkeletonChart, SkeletonCards} from '../../components/LoadingSkeletons'
import {DateRangePicker} from '../components/DateRangePicker'
import {StatCard} from '../../components/StatCard'
import {useAuth} from '../../hooks/useAuth'
import {useEffect, useState} from 'react'

interface OverviewData {
	totalUsers: number
	activeUsers: {dau: number; wau: number; mau: number}
	newSignupsToday: number
	newSignupsWeek: number
	newSignupsMonth: number
	totalSessions: number
	activeSessions: number
}

interface SignupTrend {
	date: string
	count: number
}

interface RoleDistribution {
	role: string
	count: number
}

interface SessionMetric {
	date: string
	count: number
}

const COLORS = [
	'#8b5cf6',
	'#06b6d4',
	'#f59e0b',
	'#ef4444',
	'#22c55e',
	'#ec4899',
]

export default function AdminAnalyticsPage() {
	const {apiToken} = useAuth()
	const [overview, setOverview] = useState<OverviewData | null>(null)
	const [signups, setSignups] = useState<SignupTrend[]>([])
	const [roles, setRoles] = useState<RoleDistribution[]>([])
	const [sessions, setSessions] = useState<SessionMetric[]>([])
	const [loading, setLoading] = useState(true)

	const defaultStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
		.toISOString()
		.split('T')[0]
	const defaultEnd = new Date().toISOString().split('T')[0]
	const [startDate, setStartDate] = useState(defaultStart)
	const [endDate, setEndDate] = useState(defaultEnd)

	const loadData = async () => {
		if (!apiToken) return
		setLoading(true)
		try {
			const params = `startDate=${startDate}&endDate=${endDate}`
			const [overviewRes, signupsRes, rolesRes, sessionsRes] =
				await Promise.all([
					fetch('/api/admin/analytics/overview', {
						headers: {Authorization: `Bearer ${apiToken}`},
					}),
					fetch(`/api/admin/analytics/signups?${params}`, {
						headers: {Authorization: `Bearer ${apiToken}`},
					}),
					fetch('/api/admin/analytics/roles', {
						headers: {Authorization: `Bearer ${apiToken}`},
					}),
					fetch(`/api/admin/analytics/sessions?${params}`, {
						headers: {Authorization: `Bearer ${apiToken}`},
					}),
				])

			if (overviewRes.ok)
				setOverview((await overviewRes.json()) as OverviewData)
			if (signupsRes.ok) {
				const d = (await signupsRes.json()) as {signups: SignupTrend[]}
				setSignups(d.signups)
			}
			if (rolesRes.ok) {
				const d = (await rolesRes.json()) as {distribution: RoleDistribution[]}
				setRoles(d.distribution)
			}
			if (sessionsRes.ok) {
				const d = (await sessionsRes.json()) as {sessions: SessionMetric[]}
				setSessions(d.sessions)
			}
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		loadData()
	}, [apiToken, startDate, endDate])

	const handleExportCSV = () => {
		exportToCSV(
			signups.map(s => ({date: s.date, signups: s.count})),
			'signup-trends',
		)
	}

	const handleExportPDF = () => {
		exportToPDF(
			'Analytics Report',
			signups.map(s => ({Date: s.date, Signups: s.count})),
		)
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-kumo-default">Analytics</h1>
					<p className="text-sm text-kumo-secondary mt-1">
						User growth, sessions, and system metrics
					</p>
				</div>
				<div className="flex items-center gap-3">
					<DateRangePicker
						startDate={startDate}
						endDate={endDate}
						onStartDateChange={setStartDate}
						onEndDateChange={setEndDate}
					/>
					<ExportButton
						onExportCSV={handleExportCSV}
						onExportPDF={handleExportPDF}
					/>
				</div>
			</div>

			{/* KPI Cards */}
			{loading ? (
				<SkeletonCards count={4} />
			) : overview ? (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					<StatCard
						icon={
							<UsersIcon
								size={22}
								weight="duotone"
							/>
						}
						label="Total Users"
						value={overview.totalUsers}
					/>
					<StatCard
						icon={
							<WifiHighIcon
								size={22}
								weight="duotone"
							/>
						}
						label="DAU / WAU / MAU"
						value={`${overview.activeUsers.dau}`}
						subValue={`${overview.activeUsers.wau} weekly / ${overview.activeUsers.mau} monthly`}
						color="text-kumo-success"
					/>
					<StatCard
						icon={
							<ChartLineUpIcon
								size={22}
								weight="duotone"
							/>
						}
						label="New Signups (Month)"
						value={overview.newSignupsMonth}
						color="text-kumo-accent"
					/>
					<StatCard
						icon={
							<DevicesIcon
								size={22}
								weight="duotone"
							/>
						}
						label="Active Sessions"
						value={overview.activeSessions}
						subValue={`${overview.totalSessions} total`}
					/>
				</div>
			) : null}

			{/* Charts */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Signup Trends */}
				{loading ? (
					<SkeletonChart />
				) : (
					<div className="bg-kumo-base border border-kumo-line rounded-2xl p-6">
						<h3 className="font-semibold text-kumo-default mb-4">
							User Growth
						</h3>
						<div className="h-64">
							<ResponsiveContainer
								width="100%"
								height="100%"
							>
								<LineChart data={signups}>
									<CartesianGrid
										strokeDasharray="3 3"
										stroke="var(--kumo-line, #e5e7eb)"
									/>
									<XAxis
										dataKey="date"
										tick={{
											fontSize: 11,
											fill: 'var(--kumo-secondary, #6b7280)',
										}}
									/>
									<YAxis
										tick={{
											fontSize: 11,
											fill: 'var(--kumo-secondary, #6b7280)',
										}}
									/>
									<Tooltip
										contentStyle={{
											backgroundColor: 'var(--kumo-base, #fff)',
											border: '1px solid var(--kumo-line, #e5e7eb)',
											borderRadius: '8px',
											fontSize: '12px',
										}}
									/>
									<Line
										type="monotone"
										dataKey="count"
										stroke="#8b5cf6"
										strokeWidth={2}
										dot={false}
										name="Signups"
									/>
								</LineChart>
							</ResponsiveContainer>
						</div>
					</div>
				)}

				{/* Role Distribution */}
				{loading ? (
					<SkeletonChart />
				) : (
					<div className="bg-kumo-base border border-kumo-line rounded-2xl p-6">
						<h3 className="font-semibold text-kumo-default mb-4">
							Role Distribution
						</h3>
						<div className="h-64">
							<ResponsiveContainer
								width="100%"
								height="100%"
							>
								<PieChart>
									<Pie
										data={roles}
										dataKey="count"
										nameKey="role"
										cx="50%"
										cy="50%"
										outerRadius={80}
										label={({payload}) => `${payload.role}: ${payload.count}`}
										labelLine={false}
										fontSize={11}
									>
										{roles.map((_, i) => (
											<Cell
												key={`cell-${i}`}
												fill={COLORS[i % COLORS.length]}
											/>
										))}
									</Pie>
									<Tooltip
										contentStyle={{
											backgroundColor: 'var(--kumo-base, #fff)',
											border: '1px solid var(--kumo-line, #e5e7eb)',
											borderRadius: '8px',
											fontSize: '12px',
										}}
									/>
								</PieChart>
							</ResponsiveContainer>
						</div>
					</div>
				)}

				{/* Session Metrics */}
				{loading ? (
					<SkeletonChart />
				) : (
					<div className="bg-kumo-base border border-kumo-line rounded-2xl p-6 lg:col-span-2">
						<h3 className="font-semibold text-kumo-default mb-4">
							Session Activity
						</h3>
						<div className="h-64">
							<ResponsiveContainer
								width="100%"
								height="100%"
							>
								<BarChart data={sessions}>
									<CartesianGrid
										strokeDasharray="3 3"
										stroke="var(--kumo-line, #e5e7eb)"
									/>
									<XAxis
										dataKey="date"
										tick={{
											fontSize: 11,
											fill: 'var(--kumo-secondary, #6b7280)',
										}}
									/>
									<YAxis
										tick={{
											fontSize: 11,
											fill: 'var(--kumo-secondary, #6b7280)',
										}}
									/>
									<Tooltip
										contentStyle={{
											backgroundColor: 'var(--kumo-base, #fff)',
											border: '1px solid var(--kumo-line, #e5e7eb)',
											borderRadius: '8px',
											fontSize: '12px',
										}}
									/>
									<Legend wrapperStyle={{fontSize: '12px'}} />
									<Bar
										dataKey="count"
										fill="#8b5cf6"
										name="Sessions"
										radius={[4, 4, 0, 0]}
									/>
								</BarChart>
							</ResponsiveContainer>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
