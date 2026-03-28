'use client'
import {
	UsersIcon,
	WifiHighIcon,
	DevicesIcon,
	ChartLineUpIcon,
	ClockCounterClockwiseIcon,
	CircleIcon,
} from '@phosphor-icons/react'
import {SkeletonCards} from '../components/LoadingSkeletons'
import {StatCard} from '../components/StatCard'
import {useEffect, useState} from 'react'
import {useAuth} from '../hooks/useAuth'

interface OverviewData {
	totalUsers: number
	activeUsers: {dau: number; wau: number; mau: number}
	newSignupsToday: number
	newSignupsWeek: number
	newSignupsMonth: number
	totalSessions: number
	activeSessions: number
}

interface AuditEntry {
	id: string
	actorName: string | null
	targetName: string | null
	action: string
	createdAt: string
}

export default function AdminOverviewPage() {
	const {apiToken} = useAuth()
	const [data, setData] = useState<OverviewData | null>(null)
	const [recentLogs, setRecentLogs] = useState<AuditEntry[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		if (!apiToken) return
		async function load() {
			setLoading(true)
			try {
				const [overviewRes, auditRes] = await Promise.all([
					fetch('/api/admin/analytics/overview', {
						headers: {Authorization: `Bearer ${apiToken}`},
					}),
					fetch('/api/admin/audit?page=1&pageSize=10', {
						headers: {Authorization: `Bearer ${apiToken}`},
					}),
				])
				if (overviewRes.ok) {
					const overview = (await overviewRes.json()) as OverviewData
					setData(overview)
				}
				if (auditRes.ok) {
					const audit = (await auditRes.json()) as {logs: AuditEntry[]}
					setRecentLogs(audit.logs ?? [])
				}
			} finally {
				setLoading(false)
			}
		}
		load()
	}, [apiToken])

	const formatTime = (iso: string) => {
		const diff = Date.now() - new Date(iso).getTime()
		const mins = Math.floor(diff / 60000)
		if (mins < 1) return 'just now'
		if (mins < 60) return `${mins}m ago`
		const hrs = Math.floor(mins / 60)
		if (hrs < 24) return `${hrs}h ago`
		return `${Math.floor(hrs / 24)}d ago`
	}

	const formatAction = (action: string) => {
		return action.replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase())
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-kumo-default">Admin Overview</h1>
				<p className="text-sm text-kumo-secondary mt-1">
					System overview and recent activity
				</p>
			</div>

			{loading ? (
				<SkeletonCards count={6} />
			) : data ? (
				<>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						<StatCard
							icon={<UsersIcon size={22} weight="duotone" />}
							label="Total Users"
							value={data.totalUsers}
						/>
						<StatCard
							icon={<WifiHighIcon size={22} weight="duotone" />}
							label="Daily Active Users"
							value={data.activeUsers.dau}
							color="text-kumo-success"
						/>
						<StatCard
							icon={<ChartLineUpIcon size={22} weight="duotone" />}
							label="New Signups (Week)"
							value={data.newSignupsWeek}
							color="text-kumo-accent"
						/>
						<StatCard
							icon={<DevicesIcon size={22} weight="duotone" />}
							label="Total Sessions"
							value={data.totalSessions}
						/>
						<StatCard
							icon={<WifiHighIcon size={22} weight="duotone" />}
							label="Active Sessions"
							value={data.activeSessions}
							color="text-kumo-success"
						/>
						<StatCard
							icon={<UsersIcon size={22} weight="duotone" />}
							label="Monthly Active Users"
							value={data.activeUsers.mau}
						/>
					</div>

					{/* Recent Activity */}
					<div className="bg-kumo-base border border-kumo-line rounded-2xl">
						<div className="px-5 py-4 border-b border-kumo-line flex items-center gap-2">
							<ClockCounterClockwiseIcon
								size={18}
								className="text-kumo-accent"
							/>
							<h2 className="font-semibold text-kumo-default">
								Recent Activity
							</h2>
						</div>
						{recentLogs.length === 0 ? (
							<div className="px-5 py-8 text-center text-kumo-inactive text-sm">
								No recent activity
							</div>
						) : (
							<div className="divide-y divide-kumo-line">
								{recentLogs.map(log => (
									<div
										key={log.id}
										className="px-5 py-3 flex items-center gap-3"
									>
										<CircleIcon
											size={8}
											weight="fill"
											className="text-kumo-accent shrink-0"
										/>
										<div className="flex-1 min-w-0">
											<p className="text-sm text-kumo-default truncate">
												<span className="font-medium">
													{log.actorName || 'Admin'}
												</span>{' '}
												{formatAction(log.action)}
												{log.targetName && (
													<span>
														{' '}
														for{' '}
														<span className="font-medium">
															{log.targetName}
														</span>
													</span>
												)}
											</p>
										</div>
										<span className="text-xs text-kumo-inactive shrink-0">
											{formatTime(log.createdAt)}
										</span>
									</div>
								))}
							</div>
						)}
					</div>
				</>
			) : (
				<div className="text-center text-kumo-inactive py-10">
					Failed to load overview data
				</div>
			)}
		</div>
	)
}
