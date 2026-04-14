'use client'
import {
	MagnifyingGlassIcon,
	PlusIcon,
	PencilIcon,
	TrashIcon,
	PauseIcon,
	PlayIcon,
} from '@phosphor-icons/react'
import {ToastContainer, useToasts} from '../../components/Toast'
import {ConfirmModal} from '../../components/ConfirmModal'
import {DataTable} from '../components/DataTable'
import {UserForm} from '../components/UserForm'
import {useAuth} from '../../hooks/useAuth'
import {useEffect, useState} from 'react'
import {Button} from '@cloudflare/kumo'

interface UserRow {
	id: string
	email: string | null
	nickname: string | null
	role: string
	status: string
	planTier: string
	subscriptionStatus: string
	lastLogin: string | null
	createdAt: string
}

interface UsersResponse {
	users: UserRow[]
	total: number
	page: number
	pageSize: number
}

export default function AdminUsersPage() {
	const {apiToken} = useAuth()
	const {toasts, addToast, dismissToast} = useToasts()
	const [users, setUsers] = useState<UserRow[]>([])
	const [total, setTotal] = useState(0)
	const [page, setPage] = useState(1)
	const [loading, setLoading] = useState(true)
	const [search, setSearch] = useState('')
	const [statusFilter, setStatusFilter] = useState('')
	const [roleFilter, setRoleFilter] = useState('')

	const [showCreateModal, setShowCreateModal] = useState(false)
	const [editUser, setEditUser] = useState<UserRow | null>(null)
	const [deleteUser, setDeleteUser] = useState<UserRow | null>(null)
	const [suspendUser, setSuspendUser] = useState<UserRow | null>(null)
	const [actionLoading, setActionLoading] = useState(false)

	const fetchUsers = async () => {
		if (!apiToken) return
		setLoading(true)
		try {
			const params = new URLSearchParams({
				page: String(page),
				pageSize: '20',
			})
			if (search) params.set('search', search)
			if (statusFilter) params.set('status', statusFilter)
			if (roleFilter) params.set('role', roleFilter)

			const res = await fetch(`/api/admin/users?${params}`, {
				headers: {Authorization: `Bearer ${apiToken}`},
			})
			if (res.ok) {
				const data = (await res.json()) as UsersResponse
				setUsers(data.users)
				setTotal(data.total)
			}
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		fetchUsers()
	}, [apiToken, page, statusFilter, roleFilter])

	const handleSearch = () => {
		setPage(1)
		fetchUsers()
	}

	const handleCreate = async (data: {
		email?: string
		nickname?: string
		role?: string
		password?: string
		planTier?: string
		subscriptionStatus?: string
	}) => {
		const res = await fetch('/api/admin/users', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiToken}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(data),
		})
		if (!res.ok) {
			const err = (await res.json()) as {error?: string}
			throw new Error(err.error ?? 'Failed to create user')
		}
		addToast('success', 'User created successfully')
		setShowCreateModal(false)
		fetchUsers()
	}

	const handleEdit = async (data: {
		email?: string
		nickname?: string
		role?: string
		planTier?: string
		subscriptionStatus?: string
	}) => {
		if (!editUser) return
		const res = await fetch(`/api/admin/users/${editUser.id}`, {
			method: 'PUT',
			headers: {
				Authorization: `Bearer ${apiToken}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(data),
		})
		if (!res.ok) {
			const err = (await res.json()) as {error?: string}
			throw new Error(err.error ?? 'Failed to update user')
		}
		addToast('success', 'User updated successfully')
		setEditUser(null)
		fetchUsers()
	}

	const handleSuspend = async () => {
		if (!suspendUser) return
		setActionLoading(true)
		try {
			const newStatus =
				suspendUser.status === 'suspended' ? 'active' : 'suspended'
			const res = await fetch(`/api/admin/users/${suspendUser.id}/status`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${apiToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({status: newStatus}),
			})
			if (!res.ok) {
				const err = (await res.json()) as {error?: string}
				throw new Error(err.error ?? 'Failed to update status')
			}
			addToast(
				'success',
				`User ${newStatus === 'suspended' ? 'suspended' : 'reactivated'}`,
			)
			setSuspendUser(null)
			fetchUsers()
		} catch (err) {
			addToast('error', (err as Error).message)
		} finally {
			setActionLoading(false)
		}
	}

	const handleDelete = async () => {
		if (!deleteUser) return
		setActionLoading(true)
		try {
			const res = await fetch(`/api/admin/users/${deleteUser.id}`, {
				method: 'DELETE',
				headers: {Authorization: `Bearer ${apiToken}`},
			})
			if (!res.ok) {
				const err = (await res.json()) as {error?: string}
				throw new Error(err.error ?? 'Failed to delete user')
			}
			addToast('success', 'User deleted')
			setDeleteUser(null)
			fetchUsers()
		} catch (err) {
			addToast('error', (err as Error).message)
		} finally {
			setActionLoading(false)
		}
	}

	const statusColors: Record<string, string> = {
		active: 'bg-kumo-success/15 text-kumo-success',
		suspended: 'bg-kumo-danger/15 text-kumo-danger',
		pending: 'bg-yellow-500/15 text-yellow-600',
	}

	const columns = [
		{
			key: 'id',
			header: 'Id',
			render: (u: UserRow) => (
				<div>
					<p className="font-light">{u.id || 'id not found'}</p>
				</div>
			),
		},
		{
			key: 'name',
			header: 'User',
			render: (u: UserRow) => (
				<div>
					<p className="font-medium">{u.nickname || 'No name'}</p>
					<p className="text-xs text-kumo-inactive">{u.email || 'No email'}</p>
				</div>
			),
		},
		{
			key: 'role',
			header: 'Role',
			render: (u: UserRow) => (
				<span className="px-2 py-0.5 rounded-full text-xs font-medium bg-kumo-accent/15 text-kumo-accent capitalize">
					{u.role}
				</span>
			),
		},
		{
			key: 'status',
			header: 'Status',
			render: (u: UserRow) => (
				<span
					className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[u.status] || 'bg-kumo-control text-kumo-secondary'}`}
				>
					{u.status}
				</span>
			),
		},
		{
			key: 'subscription',
			header: 'Subscription',
			render: (u: UserRow) => {
				const tier = u.planTier || 'free'
				const status = u.subscriptionStatus || 'inactive'
				const tierColor =
					tier === 'pro'
						? 'bg-kumo-accent/15 text-kumo-accent'
						: 'bg-kumo-control text-kumo-secondary'
				const statusColor =
					status === 'active'
						? 'bg-kumo-success/15 text-kumo-success'
						: 'bg-kumo-danger/15 text-kumo-danger'
				return (
					<div className="flex items-center gap-1">
						<span
							className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${tierColor}`}
						>
							{tier}
						</span>
						<span
							className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor}`}
						>
							{status}
						</span>
					</div>
				)
			},
		},
		{
			key: 'lastLogin',
			header: 'Last Login',
			render: (u: UserRow) => (
				<span className="text-xs text-kumo-secondary">
					{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
				</span>
			),
		},
		{
			key: 'createdAt',
			header: 'Joined',
			render: (u: UserRow) => (
				<span className="text-xs text-kumo-secondary">
					{new Date(u.createdAt).toLocaleDateString()}
				</span>
			),
		},
		{
			key: 'actions',
			header: '',
			render: (u: UserRow) => (
				<div
					className="flex items-center gap-1"
					onClick={e => e.stopPropagation()}
				>
					<button
						type="button"
						onClick={() => setEditUser(u)}
						className="p-1.5 rounded-lg text-kumo-secondary hover:text-kumo-default hover:bg-kumo-hover transition-colors"
						title="Edit"
					>
						<PencilIcon size={14} />
					</button>
					<button
						type="button"
						onClick={() => setSuspendUser(u)}
						className="p-1.5 rounded-lg text-kumo-secondary hover:text-kumo-default hover:bg-kumo-hover transition-colors"
						title={u.status === 'suspended' ? 'Reactivate' : 'Suspend'}
					>
						{u.status === 'suspended' ? (
							<PlayIcon size={14} />
						) : (
							<PauseIcon size={14} />
						)}
					</button>
					<button
						type="button"
						onClick={() => setDeleteUser(u)}
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
			<ToastContainer
				toasts={toasts}
				onDismiss={dismissToast}
			/>

			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-kumo-default">
						User Management
					</h1>
					<p className="mt-1 text-sm text-kumo-secondary">
						Manage user accounts, roles, and status
					</p>
				</div>
				<Button
					variant="primary"
					size="sm"
					onClick={() => setShowCreateModal(true)}
				>
					<PlusIcon size={14} />
					Create User
				</Button>
			</div>

			{/* Filters */}
			<div className="flex flex-wrap items-center gap-3">
				<div className="flex items-center flex-1 max-w-sm gap-2 min-w-50">
					<div className="relative flex-1">
						<MagnifyingGlassIcon
							size={16}
							className="absolute -translate-y-1/2 left-3 top-1/2 text-kumo-inactive"
						/>
						<input
							type="text"
							value={search}
							onChange={e => setSearch(e.target.value)}
							onKeyDown={e => e.key === 'Enter' && handleSearch()}
							placeholder="Search users..."
							className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default text-sm placeholder-kumo-inactive focus:outline-none focus:ring-2 focus:ring-kumo-ring"
						/>
					</div>
					<Button
						variant="secondary"
						size="sm"
						onClick={handleSearch}
					>
						Search
					</Button>
				</div>
				<select
					value={statusFilter}
					onChange={e => {
						setStatusFilter(e.target.value)
						setPage(1)
					}}
					className="px-3 py-1.5 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default text-sm focus:outline-none focus:ring-2 focus:ring-kumo-ring"
				>
					<option value="">All Status</option>
					<option value="active">Active</option>
					<option value="suspended">Suspended</option>
					<option value="pending">Pending</option>
				</select>
				<select
					value={roleFilter}
					onChange={e => {
						setRoleFilter(e.target.value)
						setPage(1)
					}}
					className="px-3 py-1.5 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default text-sm focus:outline-none focus:ring-2 focus:ring-kumo-ring"
				>
					<option value="">All Roles</option>
					<option value="user">User</option>
					<option value="admin">Admin</option>
				</select>
			</div>

			<DataTable<UserRow>
				columns={columns}
				data={users}
				total={total}
				page={page}
				pageSize={20}
				onPageChange={setPage}
				loading={loading}
				emptyMessage="No users found"
				keyExtractor={u => u.id}
			/>

			{/* Create Modal */}
			{showCreateModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
					<div className="w-full max-w-md p-6 space-y-4 border bg-kumo-base border-kumo-line rounded-2xl">
						<h3 className="text-lg font-semibold text-kumo-default">
							Create User
						</h3>
						<UserForm
							roles={['user', 'admin']}
							onSubmit={handleCreate}
							onCancel={() => setShowCreateModal(false)}
							isCreate
						/>
					</div>
				</div>
			)}

			{/* Edit Modal */}
			{editUser && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
					<div className="w-full max-w-md p-6 space-y-4 border bg-kumo-base border-kumo-line rounded-2xl">
						<h3 className="text-lg font-semibold text-kumo-default">
							Edit User
						</h3>
						<UserForm
							initialData={editUser}
							roles={['user', 'admin']}
							onSubmit={handleEdit}
							onCancel={() => setEditUser(null)}
						/>
					</div>
				</div>
			)}

			{/* Suspend/Reactivate Confirm */}
			<ConfirmModal
				open={!!suspendUser}
				title={
					suspendUser?.status === 'suspended'
						? 'Reactivate User'
						: 'Suspend User'
				}
				message={
					suspendUser?.status === 'suspended'
						? `Are you sure you want to reactivate ${suspendUser?.nickname || suspendUser?.email || 'this user'}?`
						: `Are you sure you want to suspend ${suspendUser?.nickname || suspendUser?.email || 'this user'}? They will be unable to access the platform.`
				}
				confirmLabel={
					suspendUser?.status === 'suspended' ? 'Reactivate' : 'Suspend'
				}
				variant={suspendUser?.status === 'suspended' ? 'primary' : 'danger'}
				loading={actionLoading}
				onConfirm={handleSuspend}
				onCancel={() => setSuspendUser(null)}
			/>

			{/* Delete Confirm */}
			<ConfirmModal
				open={!!deleteUser}
				title="Delete User"
				message={`Are you sure you want to permanently delete ${deleteUser?.nickname || deleteUser?.email || 'this user'}? This action cannot be undone.`}
				confirmLabel="Delete"
				variant="danger"
				loading={actionLoading}
				onConfirm={handleDelete}
				onCancel={() => setDeleteUser(null)}
			/>
		</div>
	)
}
