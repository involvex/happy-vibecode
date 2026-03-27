'use client'
import {
	MagnifyingGlassIcon,
	PlusIcon,
	PencilIcon,
	TrashIcon,
	ToggleLeftIcon,
	ToggleRightIcon,
} from '@phosphor-icons/react'
import {ToastContainer, useToasts} from '../components/Toast'
import {ConfirmModal} from '../components/ConfirmModal'
import {DataTable} from '../components/DataTable'
import {useAuth} from '../../hooks/useAuth'
import {useEffect, useState} from 'react'
import {Button} from '@cloudflare/kumo'

interface AgentRow {
	id: string
	name: string
	command: string
	args: string[]
	promptFlag: string | null
	modelFlag: string | null
	description: string | null
	isActive: boolean | null
	createdAt: string
	updatedAt: string
}

interface AgentsResponse {
	agents: AgentRow[]
}

interface AgentFormData {
	name: string
	command: string
	args: string
	promptFlag: string
	modelFlag: string
	description: string
	isActive: boolean
}

function AgentModal({
	initial,
	onSubmit,
	onCancel,
}: {
	initial?: AgentRow
	onSubmit: (data: AgentFormData) => Promise<void>
	onCancel: () => void
}) {
	const [form, setForm] = useState<AgentFormData>({
		name: initial?.name ?? '',
		command: initial?.command ?? '',
		args: initial?.args.join(' ') ?? '',
		promptFlag: initial?.promptFlag ?? '',
		modelFlag: initial?.modelFlag ?? '',
		description: initial?.description ?? '',
		isActive: initial?.isActive ?? true,
	})
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setLoading(true)
		setError('')
		try {
			await onSubmit(form)
		} catch (err) {
			setError((err as Error).message)
		} finally {
			setLoading(false)
		}
	}

	const field = (
		label: string,
		key: keyof AgentFormData,
		placeholder?: string,
	) => (
		<div>
			<label className="block text-xs font-medium text-kumo-secondary mb-1">
				{label}
			</label>
			<input
				type="text"
				value={form[key] as string}
				onChange={e => setForm(f => ({...f, [key]: e.target.value}))}
				placeholder={placeholder}
				className="w-full px-3 py-1.5 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default text-sm placeholder-kumo-inactive focus:outline-none focus:ring-2 focus:ring-kumo-ring"
			/>
		</div>
	)

	return (
		<form onSubmit={handleSubmit} className="space-y-3">
			{field('Name *', 'name', 'e.g. Claude Code')}
			{field('Command *', 'command', 'e.g. claude')}
			{field(
				'Args (space-separated)',
				'args',
				'e.g. --dangerously-skip-permissions',
			)}
			{field('Prompt Flag', 'promptFlag', 'e.g. -p')}
			{field('Model Flag', 'modelFlag', 'e.g. --model')}
			<div>
				<label className="block text-xs font-medium text-kumo-secondary mb-1">
					Description
				</label>
				<textarea
					value={form.description}
					onChange={e => setForm(f => ({...f, description: e.target.value}))}
					rows={2}
					className="w-full px-3 py-1.5 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default text-sm placeholder-kumo-inactive focus:outline-none focus:ring-2 focus:ring-kumo-ring resize-none"
				/>
			</div>
			<label className="flex items-center gap-2 cursor-pointer select-none">
				<input
					type="checkbox"
					checked={form.isActive}
					onChange={e => setForm(f => ({...f, isActive: e.target.checked}))}
					className="rounded border-kumo-line"
				/>
				<span className="text-sm text-kumo-default">Active</span>
			</label>
			{error && <p className="text-xs text-kumo-danger">{error}</p>}
			<div className="flex gap-2 justify-end pt-1">
				<Button variant="secondary" size="sm" type="button" onClick={onCancel}>
					Cancel
				</Button>
				<Button variant="primary" size="sm" type="submit" disabled={loading}>
					{loading ? 'Saving\u2026' : initial ? 'Update Agent' : 'Create Agent'}
				</Button>
			</div>
		</form>
	)
}

export default function AdminAgentsPage() {
	const {apiToken} = useAuth()
	const {toasts, addToast, dismissToast} = useToasts()
	const [agents, setAgents] = useState<AgentRow[]>([])
	const [loading, setLoading] = useState(true)
	const [search, setSearch] = useState('')
	const [showCreateModal, setShowCreateModal] = useState(false)
	const [editAgent, setEditAgent] = useState<AgentRow | null>(null)
	const [deleteAgent, setDeleteAgent] = useState<AgentRow | null>(null)
	const [actionLoading, setActionLoading] = useState(false)

	const fetchAgents = async () => {
		if (!apiToken) return
		setLoading(true)
		try {
			const res = await fetch('/api/admin/agents', {
				headers: {Authorization: `Bearer ${apiToken}`},
			})
			if (res.ok) {
				const data = (await res.json()) as AgentsResponse
				setAgents(data.agents)
			}
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		fetchAgents()
	}, [apiToken])

	const parseFormData = (data: AgentFormData) => ({
		name: data.name,
		command: data.command,
		args: data.args
			.split(' ')
			.map(s => s.trim())
			.filter(Boolean),
		promptFlag: data.promptFlag || undefined,
		modelFlag: data.modelFlag || undefined,
		description: data.description || undefined,
		isActive: data.isActive,
	})

	const handleCreate = async (data: AgentFormData) => {
		const res = await fetch('/api/admin/agents', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiToken}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(parseFormData(data)),
		})
		if (!res.ok) {
			const err = (await res.json()) as {error?: string}
			throw new Error(err.error ?? 'Failed to create agent')
		}
		addToast('success', 'Agent created')
		setShowCreateModal(false)
		fetchAgents()
	}

	const handleEdit = async (data: AgentFormData) => {
		if (!editAgent) return
		const res = await fetch(`/api/admin/agents/${editAgent.id}`, {
			method: 'PUT',
			headers: {
				Authorization: `Bearer ${apiToken}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(parseFormData(data)),
		})
		if (!res.ok) {
			const err = (await res.json()) as {error?: string}
			throw new Error(err.error ?? 'Failed to update agent')
		}
		addToast('success', 'Agent updated')
		setEditAgent(null)
		fetchAgents()
	}

	const handleToggleActive = async (agent: AgentRow) => {
		setActionLoading(true)
		try {
			const res = await fetch(`/api/admin/agents/${agent.id}`, {
				method: 'PUT',
				headers: {
					Authorization: `Bearer ${apiToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({isActive: !agent.isActive}),
			})
			if (!res.ok) {
				const err = (await res.json()) as {error?: string}
				throw new Error(err.error ?? 'Failed to update agent')
			}
			addToast(
				'success',
				agent.isActive ? 'Agent deactivated' : 'Agent activated',
			)
			fetchAgents()
		} catch (err) {
			addToast('error', (err as Error).message)
		} finally {
			setActionLoading(false)
		}
	}

	const handleDelete = async () => {
		if (!deleteAgent) return
		setActionLoading(true)
		try {
			const res = await fetch(`/api/admin/agents/${deleteAgent.id}`, {
				method: 'DELETE',
				headers: {Authorization: `Bearer ${apiToken}`},
			})
			if (!res.ok) {
				const err = (await res.json()) as {error?: string}
				throw new Error(err.error ?? 'Failed to delete agent')
			}
			addToast('success', 'Agent deleted')
			setDeleteAgent(null)
			fetchAgents()
		} catch (err) {
			addToast('error', (err as Error).message)
		} finally {
			setActionLoading(false)
		}
	}

	const filtered = agents.filter(
		a =>
			!search ||
			a.name.toLowerCase().includes(search.toLowerCase()) ||
			a.command.toLowerCase().includes(search.toLowerCase()),
	)

	const columns = [
		{
			key: 'name',
			header: 'Agent',
			render: (a: AgentRow) => (
				<div>
					<p className="font-medium">{a.name}</p>
					<p className="text-xs text-kumo-inactive font-mono">{a.command}</p>
				</div>
			),
		},
		{
			key: 'description',
			header: 'Description',
			render: (a: AgentRow) => (
				<span className="text-sm text-kumo-secondary">
					{a.description || '\u2014'}
				</span>
			),
		},
		{
			key: 'flags',
			header: 'Flags',
			render: (a: AgentRow) => (
				<div className="flex flex-wrap gap-1">
					{a.promptFlag && (
						<span className="px-1.5 py-0.5 rounded text-xs font-mono bg-kumo-control text-kumo-secondary">
							{a.promptFlag}
						</span>
					)}
					{a.modelFlag && (
						<span className="px-1.5 py-0.5 rounded text-xs font-mono bg-kumo-control text-kumo-secondary">
							{a.modelFlag}
						</span>
					)}
				</div>
			),
		},
		{
			key: 'isActive',
			header: 'Status',
			render: (a: AgentRow) => (
				<span
					className={`px-2 py-0.5 rounded-full text-xs font-medium ${
						a.isActive
							? 'bg-kumo-success/15 text-kumo-success'
							: 'bg-kumo-danger/15 text-kumo-danger'
					}`}
				>
					{a.isActive ? 'Active' : 'Inactive'}
				</span>
			),
		},
		{
			key: 'actions',
			header: '',
			render: (a: AgentRow) => (
				<div
					className="flex items-center gap-1"
					onClick={e => e.stopPropagation()}
				>
					<button
						type="button"
						onClick={() => setEditAgent(a)}
						className="p-1.5 rounded-lg text-kumo-secondary hover:text-kumo-default hover:bg-kumo-hover transition-colors"
						title="Edit"
					>
						<PencilIcon size={14} />
					</button>
					<button
						type="button"
						onClick={() => handleToggleActive(a)}
						disabled={actionLoading}
						className="p-1.5 rounded-lg text-kumo-secondary hover:text-kumo-default hover:bg-kumo-hover transition-colors"
						title={a.isActive ? 'Deactivate' : 'Activate'}
					>
						{a.isActive ? (
							<ToggleRightIcon size={14} />
						) : (
							<ToggleLeftIcon size={14} />
						)}
					</button>
					<button
						type="button"
						onClick={() => setDeleteAgent(a)}
						className="p-1.5 rounded-lg text-kumo-secondary hover:text-kumo-danger hover:bg-kumo-hover transition-colors"
						title="Delete"
					>
						<TrashIcon size={14} />
					</button>
				</div>
			),
		},
	]

	return (
		<div className="space-y-6">
			<ToastContainer toasts={toasts} onDismiss={dismissToast} />

			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-kumo-default">
						Agent Management
					</h1>
					<p className="text-sm text-kumo-secondary mt-1">
						Manage AI coding agents available to users
					</p>
				</div>
				<Button
					variant="primary"
					size="sm"
					onClick={() => setShowCreateModal(true)}
				>
					<PlusIcon size={14} />
					Add Agent
				</Button>
			</div>

			<div className="flex items-center gap-2 max-w-sm">
				<div className="relative flex-1">
					<MagnifyingGlassIcon
						size={16}
						className="absolute left-3 top-1/2 -translate-y-1/2 text-kumo-inactive"
					/>
					<input
						type="text"
						value={search}
						onChange={e => setSearch(e.target.value)}
						placeholder="Search agents\u2026"
						className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default text-sm placeholder-kumo-inactive focus:outline-none focus:ring-2 focus:ring-kumo-ring"
					/>
				</div>
			</div>

			<DataTable<AgentRow>
				columns={columns}
				data={filtered}
				total={filtered.length}
				page={1}
				pageSize={filtered.length}
				onPageChange={() => {}}
				loading={loading}
				emptyMessage="No agents found"
				keyExtractor={a => a.id}
			/>

			{showCreateModal && (
				<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
					<div className="bg-kumo-base border border-kumo-line rounded-2xl w-full max-w-md p-6 space-y-4">
						<h3 className="text-lg font-semibold text-kumo-default">
							Add Agent
						</h3>
						<AgentModal
							onSubmit={handleCreate}
							onCancel={() => setShowCreateModal(false)}
						/>
					</div>
				</div>
			)}

			{editAgent && (
				<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
					<div className="bg-kumo-base border border-kumo-line rounded-2xl w-full max-w-md p-6 space-y-4">
						<h3 className="text-lg font-semibold text-kumo-default">
							Edit Agent
						</h3>
						<AgentModal
							initial={editAgent}
							onSubmit={handleEdit}
							onCancel={() => setEditAgent(null)}
						/>
					</div>
				</div>
			)}

			<ConfirmModal
				open={!!deleteAgent}
				title="Delete Agent"
				message={`Are you sure you want to permanently delete "${deleteAgent?.name}"? This cannot be undone.`}
				confirmLabel="Delete"
				variant="danger"
				loading={actionLoading}
				onConfirm={handleDelete}
				onCancel={() => setDeleteAgent(null)}
			/>
		</div>
	)
}
