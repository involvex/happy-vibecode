'use client'
import {Button} from '@cloudflare/kumo'
// import {set} from 'better-auth'
import {useState} from 'react'

interface UserFormProps {
	initialData?: {
		email?: string | null
		nickname?: string | null
		role?: string
		planTier?: string
		subscriptionStatus?: string
	}
	roles: string[]
	onSubmit: (data: {
		email?: string
		nickname?: string
		role?: string
		password?: string
		planTier?: string
		subscriptionStatus?: string
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
	const [planTier, setPlanTier] = useState(initialData?.planTier ?? 'free')
	const [subscriptionStatus, setSubscriptionStatus] = useState(
		initialData?.subscriptionStatus ?? 'inactive',
	)
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
				planTier,
				subscriptionStatus,
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
				<div className="px-3 py-2 text-sm border rounded-lg text-kumo-danger bg-kumo-danger/10 border-kumo-danger/20">
					{error}
				</div>
			)}

			<div>
				<label
					htmlFor="user-email"
					className="block mb-1 text-sm font-medium text-kumo-default"
				>
					Email
				</label>
				<input
					id="user-email"
					type="email"
					value={email}
					onChange={e => setEmail(e.target.value)}
					placeholder="user@example.com"
					className="w-full px-3 py-2 border rounded-lg border-kumo-line bg-kumo-base text-kumo-default placeholder-kumo-inactive focus:outline-none focus:ring-2 focus:ring-kumo-ring"
				/>
			</div>

			<div>
				<label
					htmlFor="user-nickname"
					className="block mb-1 text-sm font-medium text-kumo-default"
				>
					Nickname
				</label>
				<input
					id="user-nickname"
					type="text"
					value={nickname}
					onChange={e => setNickname(e.target.value)}
					placeholder="Display name"
					className="w-full px-3 py-2 border rounded-lg border-kumo-line bg-kumo-base text-kumo-default placeholder-kumo-inactive focus:outline-none focus:ring-2 focus:ring-kumo-ring"
				/>
			</div>

			<div>
				<label
					htmlFor="user-role"
					className="block mb-1 text-sm font-medium text-kumo-default"
				>
					Role
				</label>
				<select
					id="user-role"
					value={role}
					onChange={e => setRole(e.target.value)}
					className="w-full px-3 py-2 border rounded-lg border-kumo-line bg-kumo-base text-kumo-default focus:outline-none focus:ring-2 focus:ring-kumo-ring"
				>
					{roles.map(r => (
						<option key={r} value={r}>
							{r}
						</option>
					))}
				</select>
			</div>
			<div>
				<label
					htmlFor="plan-tier"
					className="block mb-1 text-sm font-medium text-kumo-default"
				>
					Plan
				</label>
				<select
					id="plan-tier"
					value={planTier}
					onChange={e => setPlanTier(e.target.value)}
					className="w-full px-3 py-2 border rounded-lg border-kumo-line bg-kumo-base text-kumo-default focus:outline-none focus:ring-2 focus:ring-kumo-ring"
				>
					<option value="free">Free</option>
					<option value="pro">Pro</option>
				</select>
			</div>
			<div>
				<label
					htmlFor="subscription-status"
					className="block mb-1 text-sm font-medium text-kumo-default"
				>
					Subscription Status
				</label>
				<select
					id="subscription-status"
					value={subscriptionStatus}
					onChange={e => setSubscriptionStatus(e.target.value)}
					className="w-full px-3 py-2 border rounded-lg border-kumo-line bg-kumo-base text-kumo-default focus:outline-none focus:ring-2 focus:ring-kumo-ring"
				>
					<option value="inactive">Inactive</option>
					<option value="active">Active</option>
				</select>
			</div>

			{isCreate && (
				<div>
					<label
						htmlFor="user-password"
						className="block mb-1 text-sm font-medium text-kumo-default"
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
						className="w-full px-3 py-2 border rounded-lg border-kumo-line bg-kumo-base text-kumo-default placeholder-kumo-inactive focus:outline-none focus:ring-2 focus:ring-kumo-ring"
					/>
				</div>
			)}

			<div className="flex justify-end gap-3 pt-2">
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
