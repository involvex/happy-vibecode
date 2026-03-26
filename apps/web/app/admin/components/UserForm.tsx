'use client'
import {Button} from '@cloudflare/kumo'
import {useState} from 'react'

interface UserFormProps {
	initialData?: {
		email?: string | null
		nickname?: string | null
		role?: string
	}
	roles: string[]
	onSubmit: (data: {
		email?: string
		nickname?: string
		role?: string
		password?: string
	}) => Promise<void>
	onCancel: () => void
	isCreate?: boolean
}

export function UserForm({
	initialData,
	roles,
	onSubmit,
	onCancel,
	isCreate,
}: UserFormProps) {
	const [email, setEmail] = useState(initialData?.email ?? '')
	const [nickname, setNickname] = useState(initialData?.nickname ?? '')
	const [role, setRole] = useState(initialData?.role ?? 'user')
	const [password, setPassword] = useState('')
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setError('')
		setLoading(true)
		try {
			await onSubmit({
				email: email || undefined,
				nickname: nickname || undefined,
				role,
				password: isCreate && password ? password : undefined,
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
					htmlFor="user-email"
					className="block text-sm font-medium text-kumo-default mb-1"
				>
					Email
				</label>
				<input
					id="user-email"
					type="email"
					value={email}
					onChange={e => setEmail(e.target.value)}
					placeholder="user@example.com"
					className="w-full px-3 py-2 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default placeholder-kumo-inactive focus:outline-none focus:ring-2 focus:ring-kumo-ring"
				/>
			</div>

			<div>
				<label
					htmlFor="user-nickname"
					className="block text-sm font-medium text-kumo-default mb-1"
				>
					Nickname
				</label>
				<input
					id="user-nickname"
					type="text"
					value={nickname}
					onChange={e => setNickname(e.target.value)}
					placeholder="Display name"
					className="w-full px-3 py-2 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default placeholder-kumo-inactive focus:outline-none focus:ring-2 focus:ring-kumo-ring"
				/>
			</div>

			<div>
				<label
					htmlFor="user-role"
					className="block text-sm font-medium text-kumo-default mb-1"
				>
					Role
				</label>
				<select
					id="user-role"
					value={role}
					onChange={e => setRole(e.target.value)}
					className="w-full px-3 py-2 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default focus:outline-none focus:ring-2 focus:ring-kumo-ring"
				>
					{roles.map(r => (
						<option key={r} value={r}>
							{r}
						</option>
					))}
				</select>
			</div>

			{isCreate && (
				<div>
					<label
						htmlFor="user-password"
						className="block text-sm font-medium text-kumo-default mb-1"
					>
						Password (optional)
					</label>
					<input
						id="user-password"
						type="password"
						value={password}
						onChange={e => setPassword(e.target.value)}
						placeholder="Leave empty for auto-generated"
						minLength={8}
						className="w-full px-3 py-2 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default placeholder-kumo-inactive focus:outline-none focus:ring-2 focus:ring-kumo-ring"
					/>
				</div>
			)}

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
					{loading ? 'Saving...' : isCreate ? 'Create User' : 'Save Changes'}
				</Button>
			</div>
		</form>
	)
}
