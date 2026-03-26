'use client'
import {MagnifyingGlassIcon} from '@phosphor-icons/react'
import {DataTable} from '../components/DataTable'
import {useAuth} from '../../hooks/useAuth'
import {useEffect, useState} from 'react'

interface AuditEntry {
	id: string
	actorId: string
	actorName: string | null
	targetId: string | null
	targetName: string | null
	action: string
	details: string | null
	createdAt: string
}

interface AuditResponse {
	logs: AuditEntry[]
	total: number
	page: number
	pageSize: number
}

export default function AdminAuditPage() {
	const {apiToken} = useAuth()
	const [logs, setLogs] = useState<AuditEntry[]>([])
	const [total, setTotal] = useState(0)
	const [page, setPage] = useState(1)
	const [loading, setLoading] = useState(true)
	const [actionFilter, setActionFilter] = useState('')

	const fetchLogs = async () => {
		if (!apiToken) return
		setLoading(true)
		try {
			const params = new URLSearchParams({
				page: String(page),
				pageSize: '20',
			})
			if (actionFilter) params.set('action', actionFilter)

			const res = await fetch(`/api/admin/audit?${params}`, {
				headers: {Authorization: `Bearer ${apiToken}`},
			})
			if (res.ok) {
				const data = (await res.json()) as AuditResponse
				setLogs(data.logs)
				setTotal(data.total)
			}
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		fetchLogs()
	}, [apiToken, page, actionFilter])

	const formatAction = (action: string) => {
		return action.replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase())
	}

	const actionColors: Record<string, string> = {
		'user.create': 'bg-green-500/15 text-green-600',
		'user.update': 'bg-blue-500/15 text-blue-600',
		'user.delete': 'bg-red-500/15 text-red-600',
		'user.suspended': 'bg-yellow-500/15 text-yellow-600',
		'user.active': 'bg-green-500/15 text-green-600',
		'user.password_reset': 'bg-orange-500/15 text-orange-600',
		'user.settings_override': 'bg-purple-500/15 text-purple-600',
		'role.create': 'bg-green-500/15 text-green-600',
		'role.update': 'bg-blue-500/15 text-blue-600',
		'role.delete': 'bg-red-500/15 text-red-600',
		'role.bulk_assign': 'bg-cyan-500/15 text-cyan-600',
	}

	const columns = [
		{
			key: 'createdAt',
			header: 'Timestamp',
			render: (l: AuditEntry) => (
				<span className="text-kumo-secondary text-xs whitespace-nowrap">
					{new Date(l.createdAt).toLocaleString()}
				</span>
			),
			className: 'w-40',
		},
		{
			key: 'actor',
			header: 'Actor',
			render: (l: AuditEntry) => (
				<div>
					<p className="text-sm font-medium">{l.actorName || 'Admin'}</p>
					<p className="text-xs text-kumo-inactive font-mono">
						{l.actorId.slice(0, 8)}...
					</p>
				</div>
			),
		},
		{
			key: 'action',
			header: 'Action',
			render: (l: AuditEntry) => (
				<span
					className={`px-2 py-0.5 rounded-full text-xs font-medium ${actionColors[l.action] || 'bg-kumo-control text-kumo-secondary'}`}
				>
					{formatAction(l.action)}
				</span>
			),
		},
		{
			key: 'target',
			header: 'Target',
			render: (l: AuditEntry) => (
				<div>
					{l.targetName && <p className="text-sm">{l.targetName}</p>}
					{l.targetId && (
						<p className="text-xs text-kumo-inactive font-mono">
							{l.targetId.slice(0, 8)}...
						</p>
					)}
					{!l.targetName && !l.targetId && (
						<span className="text-xs text-kumo-inactive">—</span>
					)}
				</div>
			),
		},
		{
			key: 'details',
			header: 'Details',
			render: (l: AuditEntry) => {
				if (!l.details)
					return <span className="text-xs text-kumo-inactive">—</span>
				try {
					const parsed = JSON.parse(l.details) as Record<string, unknown>
					const summary = Object.entries(parsed)
						.slice(0, 3)
						.map(([k, v]) => `${k}: ${v}`)
						.join(', ')
					return (
						<span className="text-xs text-kumo-secondary" title={l.details}>
							{summary.length > 60 ? summary.slice(0, 60) + '...' : summary}
						</span>
					)
				} catch {
					return (
						<span className="text-xs text-kumo-secondary">
							{l.details.slice(0, 60)}
						</span>
					)
				}
			},
		},
	]

	const actionTypes = [
		'user.create',
		'user.update',
		'user.delete',
		'user.suspended',
		'user.active',
		'user.password_reset',
		'user.settings_override',
		'role.create',
		'role.update',
		'role.delete',
		'role.bulk_assign',
	]

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-kumo-default">Audit Log</h1>
				<p className="text-sm text-kumo-secondary mt-1">
					Chronological record of all administrative actions
				</p>
			</div>

			{/* Filter */}
			<div className="flex items-center gap-3">
				<div className="relative max-w-xs">
					<MagnifyingGlassIcon
						size={16}
						className="absolute left-3 top-1/2 -translate-y-1/2 text-kumo-inactive"
					/>
					<select
						value={actionFilter}
						onChange={e => {
							setActionFilter(e.target.value)
							setPage(1)
						}}
						className="pl-9 pr-3 py-1.5 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default text-sm focus:outline-none focus:ring-2 focus:ring-kumo-ring"
					>
						<option value="">All Actions</option>
						{actionTypes.map(at => (
							<option key={at} value={at}>
								{at.replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
							</option>
						))}
					</select>
				</div>
			</div>

			<DataTable
				columns={columns}
				data={logs}
				total={total}
				page={page}
				pageSize={20}
				onPageChange={setPage}
				loading={loading}
				emptyMessage="No audit log entries found"
				keyExtractor={l => l.id}
			/>
		</div>
	)
}
