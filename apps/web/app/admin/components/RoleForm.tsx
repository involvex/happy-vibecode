'use client'
import {Button} from '@cloudflare/kumo'
import {useState} from 'react'

const MODULES = [
	'users',
	'roles',
	'sessions',
	'workspaces',
	'tickets',
	'analytics',
	'audit',
] as const
const ACTIONS = ['read', 'write', 'delete'] as const

interface RoleFormProps {
	initialData?: {
		name?: string
		description?: string | null
		permissions?: Record<string, string>
	}
	onSubmit: (data: {
		name: string
		description?: string
		permissions: Record<string, string>
	}) => Promise<void>
	onCancel: () => void
	isCreate?: boolean
}

export function RoleForm({
	initialData,
	onSubmit,
	onCancel,
	isCreate,
}: RoleFormProps) {
	const [name, setName] = useState(initialData?.name ?? '')
	const [description, setDescription] = useState(initialData?.description ?? '')
	const [permissions, setPermissions] = useState<Record<string, string>>(
		initialData?.permissions ?? {},
	)
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)

	const togglePermission = (module: string, action: string) => {
		setPermissions(prev => {
			const current = prev[module] || ''
			const parts = current ? current.split('|') : []
			const idx = parts.indexOf(action)
			if (idx >= 0) {
				parts.splice(idx, 1)
			} else {
				parts.push(action)
			}
			const updated = {...prev}
			if (parts.length === 0) {
				delete updated[module]
			} else {
				updated[module] = parts.join('|')
			}
			return updated
		})
	}

	const hasPermission = (module: string, action: string) => {
		const perms = permissions[module] || ''
		return perms.split('|').includes(action)
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!name.trim()) {
			setError('Role name is required')
			return
		}
		setError('')
		setLoading(true)
		try {
			await onSubmit({
				name: name.trim(),
				description: description.trim() || undefined,
				permissions,
			})
		} catch (err) {
			setError((err as Error).message)
		} finally {
			setLoading(false)
		}
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			{error && (
				<div className="text-sm text-kumo-danger bg-kumo-danger/10 border border-kumo-danger/20 rounded-lg px-3 py-2">
					{error}
				</div>
			)}

			<div>
				<label
					htmlFor="role-name"
					className="block text-sm font-medium text-kumo-default mb-1"
				>
					Role Name
				</label>
				<input
					id="role-name"
					type="text"
					value={name}
					onChange={e => setName(e.target.value)}
					placeholder="e.g., Content Manager"
					maxLength={50}
					className="w-full px-3 py-2 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default placeholder-kumo-inactive focus:outline-none focus:ring-2 focus:ring-kumo-ring"
				/>
			</div>

			<div>
				<label
					htmlFor="role-desc"
					className="block text-sm font-medium text-kumo-default mb-1"
				>
					Description
				</label>
				<input
					id="role-desc"
					type="text"
					value={description}
					onChange={e => setDescription(e.target.value)}
					placeholder="Brief description of this role"
					maxLength={200}
					className="w-full px-3 py-2 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default placeholder-kumo-inactive focus:outline-none focus:ring-2 focus:ring-kumo-ring"
				/>
			</div>

			<div>
				<p className="block text-sm font-medium text-kumo-default mb-2">
					Permissions
				</p>
				<div className="border border-kumo-line rounded-lg overflow-hidden">
					<table className="w-full">
						<thead>
							<tr className="bg-kumo-control/30 border-b border-kumo-line">
								<th className="px-3 py-2 text-left text-xs font-semibold text-kumo-secondary uppercase">
									Module
								</th>
								{ACTIONS.map(action => (
									<th
										key={action}
										className="px-3 py-2 text-center text-xs font-semibold text-kumo-secondary uppercase"
									>
										{action}
									</th>
								))}
							</tr>
						</thead>
						<tbody className="divide-y divide-kumo-line">
							{MODULES.map(module => (
								<tr key={module}>
									<td className="px-3 py-2 text-sm text-kumo-default capitalize">
										{module}
									</td>
									{ACTIONS.map(action => (
										<td key={action} className="px-3 py-2 text-center">
											<input
												type="checkbox"
												checked={hasPermission(module, action)}
												onChange={() => togglePermission(module, action)}
												className="w-4 h-4 rounded border-kumo-line text-kumo-accent focus:ring-kumo-ring"
											/>
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			<div className="flex gap-3 justify-end pt-2">
				<Button
					variant="secondary"
					size="sm"
					onClick={onCancel}
					disabled={loading}
					type="button"
				>
					Cancel
				</Button>
				<Button variant="primary" size="sm" disabled={loading} type="submit">
					{loading ? 'Saving...' : isCreate ? 'Create Role' : 'Save Changes'}
				</Button>
			</div>
		</form>
	)
}
