'use client'
import {
	// CircleIcon,
	PlusIcon,
	PencilIcon,
	TrashIcon,
	ShieldCheckIcon,
	UsersIcon,
} from '@phosphor-icons/react'
import {ToastContainer, useToasts} from '../components/Toast'
import {ConfirmModal} from '../components/ConfirmModal'
import {RoleForm} from '../components/RoleForm'
import {useAuth} from '../../hooks/useAuth'
import {useEffect, useState} from 'react'
import {Button} from '@cloudflare/kumo'

interface RoleRow {
	id: string
	name: string
	description: string | null
	permissions: Record<string, string>
	userCount: number
	createdAt: string
	updatedAt: string
}

const BUILT_IN_IDS = [
	'role_super_admin',
	'role_admin',
	'role_editor',
	'role_viewer',
]

export default function AdminRolesPage() {
	const {apiToken} = useAuth()
	const {toasts, addToast, dismissToast} = useToasts()
	const [roles, setRoles] = useState<RoleRow[]>([])
	const [loading, setLoading] = useState(true)

	const [showCreateModal, setShowCreateModal] = useState(false)
	const [editRole, setEditRole] = useState<RoleRow | null>(null)
	const [deleteRole, setDeleteRole] = useState<RoleRow | null>(null)
	const [actionLoading, setActionLoading] = useState(false)

	const [bulkAssignRole, setBulkAssignRole] = useState<RoleRow | null>(null)
	const [bulkUserIds, setBulkUserIds] = useState('')

	const fetchRoles = async () => {
		if (!apiToken) return
		setLoading(true)
		try {
			const res = await fetch('/api/admin/roles', {
				headers: {Authorization: `Bearer ${apiToken}`},
			})
			if (res.ok) {
				const data = (await res.json()) as {roles: RoleRow[]}
				setRoles(data.roles)
			}
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		fetchRoles()
	}, [apiToken])

	const handleCreate = async (data: {
		name: string
		description?: string
		permissions: Record<string, string>
	}) => {
		const res = await fetch('/api/admin/roles', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiToken}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(data),
		})
		if (!res.ok) {
			const err = (await res.json()) as {error?: string}
			throw new Error(err.error ?? 'Failed to create role')
		}
		addToast('success', 'Role created successfully')
		setShowCreateModal(false)
		fetchRoles()
	}

	const handleEdit = async (data: {
		name: string
		description?: string
		permissions: Record<string, string>
	}) => {
		if (!editRole) return
		const res = await fetch(`/api/admin/roles/${editRole.id}`, {
			method: 'PUT',
			headers: {
				Authorization: `Bearer ${apiToken}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(data),
		})
		if (!res.ok) {
			const err = (await res.json()) as {error?: string}
			throw new Error(err.error ?? 'Failed to update role')
		}
		addToast('success', 'Role updated successfully')
		setEditRole(null)
		fetchRoles()
	}

	const handleDelete = async () => {
		if (!deleteRole) return
		setActionLoading(true)
		try {
			const res = await fetch(`/api/admin/roles/${deleteRole.id}`, {
				method: 'DELETE',
				headers: {Authorization: `Bearer ${apiToken}`},
			})
			if (!res.ok) {
				const err = (await res.json()) as {error?: string}
				throw new Error(err.error ?? 'Failed to delete role')
			}
			addToast('success', 'Role deleted')
			setDeleteRole(null)
			fetchRoles()
		} catch (err) {
			addToast('error', (err as Error).message)
		} finally {
			setActionLoading(false)
		}
	}

	const handleBulkAssign = async () => {
		if (!bulkAssignRole || !bulkUserIds.trim()) return
		setActionLoading(true)
		try {
			const userIds = bulkUserIds
				.split(',')
				.map(id => id.trim())
				.filter(Boolean)
			const res = await fetch('/api/admin/roles/assign', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${apiToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({roleName: bulkAssignRole.name, userIds}),
			})
			if (!res.ok) {
				const err = (await res.json()) as {error?: string}
				throw new Error(err.error ?? 'Failed to assign roles')
			}
			addToast('success', `Role assigned to ${userIds.length} user(s)`)
			setBulkAssignRole(null)
			setBulkUserIds('')
			fetchRoles()
		} catch (err) {
			addToast('error', (err as Error).message)
		} finally {
			setActionLoading(false)
		}
	}

	const formatPermissions = (perms: Record<string, string>) => {
		return Object.entries(perms).map(([mod, actions]) => (
			<span
				key={mod}
				className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-kumo-control text-kumo-secondary mr-1 mb-1"
			>
				<span className="font-medium capitalize">{mod}</span>
				<span className="text-kumo-inactive">:</span>
				<span>{actions}</span>
			</span>
		))
	}

	return (
		<div className="space-y-6">
			<ToastContainer toasts={toasts} onDismiss={dismissToast} />

			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-kumo-default">
						Role Management
					</h1>
					<p className="mt-1 text-sm text-kumo-secondary">
						Define custom roles with granular permissions
					</p>
				</div>
				<Button
					variant="primary"
					size="sm"
					onClick={() => setShowCreateModal(true)}
				>
					<PlusIcon size={14} />
					Create Role
				</Button>
			</div>

			{loading ? (
				<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
					{[1, 2, 3, 4].map(i => (
						<div
							key={i}
							className="p-6 space-y-3 border bg-kumo-base border-kumo-line rounded-2xl"
						>
							<div className="w-32 h-5 rounded bg-kumo-control animate-pulse" />
							<div className="w-48 h-3 rounded bg-kumo-control animate-pulse" />
							<div className="h-8 rounded bg-kumo-control animate-pulse" />
						</div>
					))}
				</div>
			) : (
				<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
					{roles.map(role => {
						const isBuiltIn = BUILT_IN_IDS.includes(role.id)
						return (
							<div
								key={role.id}
								className="p-6 space-y-4 border bg-kumo-base border-kumo-line rounded-2xl"
							>
								<div className="flex items-start justify-between">
									<div className="flex items-center gap-2">
										<ShieldCheckIcon size={18} className="text-kumo-accent" />
										<div>
											<h3 className="font-semibold text-kumo-default">
												{role.name}
											</h3>
											{role.description && (
												<p className="text-xs text-kumo-secondary mt-0.5">
													{role.description}
												</p>
											)}
										</div>
									</div>
									<div className="flex items-center gap-1">
										<button
											type="button"
											onClick={() => setEditRole(role)}
											className="p-1.5 rounded-lg text-kumo-secondary hover:text-kumo-default hover:bg-kumo-hover transition-colors"
											title="Edit"
										>
											<PencilIcon size={14} />
										</button>
										{!isBuiltIn && (
											<button
												type="button"
												onClick={() => setDeleteRole(role)}
												className="p-1.5 rounded-lg text-kumo-secondary hover:text-kumo-danger hover:bg-kumo-hover transition-colors"
												title="Delete"
											>
												<TrashIcon size={14} />
											</button>
										)}
										<button
											type="button"
											onClick={() => setBulkAssignRole(role)}
											className="p-1.5 rounded-lg text-kumo-secondary hover:text-kumo-default hover:bg-kumo-hover transition-colors"
											title="Bulk Assign"
										>
											<UsersIcon size={14} />
										</button>
									</div>
								</div>

								<div className="flex items-center gap-2 text-sm text-kumo-secondary">
									<UsersIcon size={14} />
									<span>
										{role.userCount} user{role.userCount !== 1 ? 's' : ''}
									</span>
									{isBuiltIn && (
										<span className="px-1.5 py-0.5 rounded text-xs bg-kumo-accent/15 text-kumo-accent">
											Built-in
										</span>
									)}
								</div>

								<div>
									<p className="text-xs text-kumo-secondary mb-1.5">
										Permissions
									</p>
									<div>{formatPermissions(role.permissions)}</div>
								</div>
							</div>
						)
					})}
				</div>
			)}

			{/* Create Modal */}
			{showCreateModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
					<div className="bg-kumo-base border border-kumo-line rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
						<h3 className="text-lg font-semibold text-kumo-default">
							Create Role
						</h3>
						<RoleForm
							onSubmit={handleCreate}
							onCancel={() => setShowCreateModal(false)}
							isCreate
						/>
					</div>
				</div>
			)}

			{/* Edit Modal */}
			{editRole && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
					<div className="bg-kumo-base border border-kumo-line rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
						<h3 className="text-lg font-semibold text-kumo-default">
							Edit Role
						</h3>
						<RoleForm
							initialData={editRole}
							onSubmit={handleEdit}
							onCancel={() => setEditRole(null)}
						/>
					</div>
				</div>
			)}

			{/* Bulk Assign Modal */}
			{bulkAssignRole && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
					<div className="w-full max-w-md p-6 space-y-4 border bg-kumo-base border-kumo-line rounded-2xl">
						<h3 className="text-lg font-semibold text-kumo-default">
							Assign &quot;{bulkAssignRole.name}&quot; to Users
						</h3>
						<div>
							<label
								htmlFor="bulk-user-ids"
								className="block mb-1 text-sm font-medium text-kumo-default"
							>
								User IDs (comma-separated)
							</label>
							<textarea
								id="bulk-user-ids"
								value={bulkUserIds}
								onChange={e => setBulkUserIds(e.target.value)}
								placeholder="user-id-1, user-id-2, ..."
								rows={3}
								className="w-full px-3 py-2 text-sm border rounded-lg border-kumo-line bg-kumo-base text-kumo-default placeholder-kumo-inactive focus:outline-none focus:ring-2 focus:ring-kumo-ring"
							/>
						</div>
						<div className="flex justify-end gap-3">
							<Button
								variant="secondary"
								size="sm"
								onClick={() => {
									setBulkAssignRole(null)
									setBulkUserIds('')
								}}
								disabled={actionLoading}
							>
								Cancel
							</Button>
							<Button
								variant="primary"
								size="sm"
								onClick={handleBulkAssign}
								disabled={actionLoading || !bulkUserIds.trim()}
							>
								{actionLoading ? 'Assigning...' : 'Assign Role'}
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Delete Confirm */}
			<ConfirmModal
				open={!!deleteRole}
				title="Delete Role"
				message={`Are you sure you want to delete the role "${deleteRole?.name}"? Users with this role will need to be reassigned.`}
				confirmLabel="Delete"
				variant="danger"
				loading={actionLoading}
				onConfirm={handleDelete}
				onCancel={() => setDeleteRole(null)}
			/>
		</div>
	)
}
