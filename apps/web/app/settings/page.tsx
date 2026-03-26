'use client'
import {
	CircleIcon,
	CopyIcon,
	EyeIcon,
	EyeSlashIcon,
	KeyIcon,
	LockIcon,
	ShieldCheckIcon,
	TrashIcon,
	EnvelopeSimpleIcon,
} from '@phosphor-icons/react'
import {WorkspaceSelector} from '../components/WorkspaceSelector'
import {useWorkspaces} from '../hooks/useWorkspaces'
import {zodResolver} from '@hookform/resolvers/zod'
import {Button, Link, Text} from '@cloudflare/kumo'
import {useRouter} from 'next/navigation'
import {useEffect, useState} from 'react'
import {useAuth} from '../hooks/useAuth'
import {useForm} from 'react-hook-form'
import {Nav} from '../components/Nav'
import {z} from 'zod'

const linkEmailSchema = z.object({
	email: z.string().email('Please enter a valid email address'),
})

const setPasswordSchema = z
	.object({
		password: z
			.string()
			.min(8, 'Password must be at least 8 characters')
			.max(100, 'Password must be less than 100 characters'),
		confirmPassword: z.string(),
	})
	.refine(data => data.password === data.confirmPassword, {
		message: 'Passwords do not match',
		path: ['confirmPassword'],
	})

const changePasswordSchema = z
	.object({
		currentPassword: z.string().min(1, 'Current password is required'),
		newPassword: z
			.string()
			.min(8, 'Password must be at least 8 characters')
			.max(100, 'Password must be less than 100 characters'),
		confirmPassword: z.string(),
	})
	.refine(data => data.newPassword === data.confirmPassword, {
		message: 'Passwords do not match',
		path: ['confirmPassword'],
	})

type LinkEmailForm = z.infer<typeof linkEmailSchema>
type SetPasswordForm = z.infer<typeof setPasswordSchema>
type ChangePasswordForm = z.infer<typeof changePasswordSchema>

interface UserProfile {
	email: string | null
	nickname: string | null
	githubId: string | null
	hasPassword: boolean
	role: 'user' | 'admin'
}

export default function SettingsPage() {
	const {isAuthed, isLoaded, apiToken, userId, serverUrl, logout} = useAuth()
	const {
		workspaces,
		activeWorkspaceId,
		addWorkspace,
		removeWorkspace,
		setActiveWorkspace,
	} = useWorkspaces()
	const router = useRouter()

	const [showToken, setShowToken] = useState(false)
	const [copied, setCopied] = useState(false)
	const [rotating, setRotating] = useState(false)
	const [rotateError, setRotateError] = useState('')
	const [rotateSuccess, setRotateSuccess] = useState('')

	const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
	const [profileLoading, setProfileLoading] = useState(true)

	const [showPasswordForm, setShowPasswordForm] = useState<
		'set' | 'change' | null
	>(null)
	const [passwordSuccess, setPasswordSuccess] = useState('')
	const [passwordError, setPasswordError] = useState('')

	const linkEmailForm = useForm<LinkEmailForm>({
		resolver: zodResolver(linkEmailSchema),
		defaultValues: {email: ''},
	})

	const setPasswordForm = useForm<SetPasswordForm>({
		resolver: zodResolver(setPasswordSchema),
		defaultValues: {password: '', confirmPassword: ''},
	})

	const changePasswordForm = useForm<ChangePasswordForm>({
		resolver: zodResolver(changePasswordSchema),
		defaultValues: {currentPassword: '', newPassword: '', confirmPassword: ''},
	})

	useEffect(() => {
		if (isLoaded && !isAuthed) {
			router.replace('/login')
		}
	}, [isLoaded, isAuthed, router])

	useEffect(() => {
		if (apiToken && isAuthed) {
			setProfileLoading(true)
			fetch('/api/user/profile', {
				headers: {Authorization: `Bearer ${apiToken}`},
			})
				.then(res => res.json() as Promise<UserProfile>)
				.then(data => {
					setUserProfile(data)
				})
				.catch(console.error)
				.finally(() => setProfileLoading(false))
		}
	}, [apiToken, isAuthed])

	const handleCopy = () => {
		if (!apiToken) return
		navigator.clipboard.writeText(apiToken)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	const handleRotate = async () => {
		if (!apiToken) return
		setRotating(true)
		setRotateError('')
		setRotateSuccess('')
		try {
			const res = await fetch('/api/auth/rotate', {
				method: 'POST',
				headers: {Authorization: `Bearer ${apiToken}`},
			})
			if (!res.ok) {
				const data = (await res.json()) as {error?: string}
				throw new Error(data.error ?? 'Failed to rotate token')
			}
			const data = (await res.json()) as {apiToken: string}
			localStorage.setItem('happy-api-token', data.apiToken)
			setRotateSuccess(
				"Token rotated! Copy your new token — it won't be shown again.",
			)
			setShowToken(true)
		} catch (err) {
			setRotateError((err as Error).message)
		} finally {
			setRotating(false)
		}
	}

	const handleLinkEmail = async (data: LinkEmailForm) => {
		if (!apiToken) return
		setPasswordError('')
		try {
			const res = await fetch('/api/user/link-email', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${apiToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
			})
			if (!res.ok) {
				const err = (await res.json()) as {error?: string}
				throw new Error(err.error ?? 'Failed to link email')
			}
			const result = (await res.json()) as {email: string}
			setUserProfile(prev => (prev ? {...prev, email: result.email} : null))
			linkEmailForm.reset()
			setPasswordSuccess('Email linked successfully!')
			setTimeout(() => setPasswordSuccess(''), 3000)
		} catch (err) {
			setPasswordError((err as Error).message)
		}
	}

	const handleSetPassword = async (data: SetPasswordForm) => {
		if (!apiToken) return
		setPasswordError('')
		try {
			const res = await fetch('/api/user/password/set', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${apiToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({password: data.password}),
			})
			if (!res.ok) {
				const err = (await res.json()) as {error?: string}
				throw new Error(err.error ?? 'Failed to set password')
			}
			setUserProfile(prev => (prev ? {...prev, hasPassword: true} : null))
			setPasswordForm.reset()
			setShowPasswordForm(null)
			setPasswordSuccess('Password set successfully!')
			setTimeout(() => setPasswordSuccess(''), 3000)
		} catch (err) {
			setPasswordError((err as Error).message)
		}
	}

	const handleChangePassword = async (data: ChangePasswordForm) => {
		if (!apiToken) return
		setPasswordError('')
		try {
			const res = await fetch('/api/user/password/change', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${apiToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					currentPassword: data.currentPassword,
					newPassword: data.newPassword,
				}),
			})
			if (!res.ok) {
				const err = (await res.json()) as {error?: string}
				throw new Error(err.error ?? 'Failed to change password')
			}
			changePasswordForm.reset()
			setShowPasswordForm(null)
			setPasswordSuccess('Password changed successfully!')
			setTimeout(() => setPasswordSuccess(''), 3000)
		} catch (err) {
			setPasswordError((err as Error).message)
		}
	}

	const handleLogout = () => {
		logout()
		router.replace('/login')
	}

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

	const maskedToken = apiToken
		? `${apiToken.slice(0, 8)}${'•'.repeat(24)}${apiToken.slice(-4)}`
		: ''

	const isGitHubUser = userProfile?.githubId && !userProfile?.email
	const canSetPassword = userProfile?.githubId && !userProfile?.hasPassword
	const canChangePassword = userProfile?.hasPassword
	const Role = userProfile?.role
	const isAdmin = Role === 'admin'
	return (
		<div className="min-h-screen bg-kumo-elevated">
			<Nav onLogout={handleLogout} />

			<main className="max-w-2xl px-6 py-10 mx-auto space-y-6">
				<h1 className="text-2xl font-bold text-kumo-default">Settings</h1>

				{passwordSuccess && (
					<div className="px-3 py-2 text-sm border rounded-lg text-kumo-success bg-kumo-success/10 border-kumo-success/20">
						{passwordSuccess}
					</div>
				)}

				{passwordError && (
					<div className="px-3 py-2 text-sm border rounded-lg text-kumo-danger bg-kumo-danger/10 border-kumo-danger/20">
						{passwordError}
					</div>
				)}

				{/* Account */}
				<section className="p-6 space-y-4 border bg-kumo-base border-kumo-line rounded-2xl">
					<div className="flex items-center gap-2 font-semibold text-kumo-default">
						<ShieldCheckIcon size={18} weight="duotone" />
						Account
					</div>
					<div className="space-y-1 text-sm">
						<p className="text-kumo-secondary">User ID</p>
						<p className="font-mono text-sm text-kumo-default">{userId}</p>
						<p className="text-kumo-secondary">Role</p>
						<p className="text-sm text-kumo-info">{Role}</p>
						{isAdmin ? (
							<Link href="/admin" className="text-sm text-kumo-info-tint">
								Go to Admin Dashboard
							</Link>
						) : (
							<br />
						)}
					</div>
					{profileLoading ? (
						<div className="flex items-center gap-2 text-sm text-kumo-inactive">
							<CircleIcon size={14} weight="duotone" className="animate-spin" />
							Loading...
						</div>
					) : (
						<>
							{userProfile?.email && (
								<div className="space-y-1 text-sm">
									<p className="text-kumo-secondary">Email</p>
									<p className="text-sm text-kumo-default">
										{userProfile.email}
									</p>
								</div>
							)}
							{userProfile?.githubId && (
								<div className="space-y-1 text-sm">
									<p className="text-kumo-secondary">Sign-in method</p>
									<p className="flex items-center gap-2 text-sm text-kumo-default">
										<svg
											width="16"
											height="16"
											viewBox="0 0 24 24"
											fill="currentColor"
											className="text-kumo-inactive"
											aria-hidden="true"
										>
											<title>GitHub</title>
											<path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
										</svg>
										GitHub
									</p>
								</div>
							)}
						</>
					)}
				</section>

				{/* Email Assignment - For GitHub users without email */}
				{isGitHubUser && (
					<section className="p-6 space-y-4 border bg-kumo-base border-kumo-line rounded-2xl">
						<div className="flex items-center gap-2 font-semibold text-kumo-default">
							<EnvelopeSimpleIcon size={18} weight="duotone" />
							Link Email Address
						</div>
						<Text size="sm" variant="secondary">
							Link an email address to your account to enable password sign-in.
						</Text>
						<form
							onSubmit={linkEmailForm.handleSubmit(handleLinkEmail)}
							className="space-y-3"
						>
							<div>
								<label htmlFor="email" className="sr-only">
									Email
								</label>
								<input
									id="email"
									type="email"
									placeholder="you@example.com"
									{...linkEmailForm.register('email')}
									className="w-full px-3 py-2 border rounded-lg border-kumo-line bg-kumo-base text-kumo-default placeholder-kumo-inactive focus:outline-none focus:ring-2 focus:ring-kumo-ring focus:border-transparent"
								/>
								{linkEmailForm.formState.errors.email && (
									<p className="mt-1 text-xs text-kumo-danger">
										{linkEmailForm.formState.errors.email.message}
									</p>
								)}
							</div>
							<Button
								type="submit"
								variant="primary"
								size="sm"
								disabled={linkEmailForm.formState.isSubmitting}
							>
								{linkEmailForm.formState.isSubmitting
									? 'Linking...'
									: 'Link Email'}
							</Button>
						</form>
					</section>
				)}

				{/* Password Management */}
				{(canSetPassword || canChangePassword) && (
					<section className="p-6 space-y-4 border bg-kumo-base border-kumo-line rounded-2xl">
						<div className="flex items-center gap-2 font-semibold text-kumo-default">
							<LockIcon size={18} weight="duotone" />
							Password
						</div>
						<Text size="sm" variant="secondary">
							{canSetPassword
								? 'Set a password to enable email/password sign-in.'
								: 'Change your password to keep your account secure.'}
						</Text>

						{passwordSuccess && (
							<div className="px-3 py-2 text-sm border rounded-lg text-kumo-success bg-kumo-success/10 border-kumo-success/20">
								{passwordSuccess}
							</div>
						)}

						{!showPasswordForm ? (
							<Button
								variant="secondary"
								size="sm"
								onClick={() =>
									setShowPasswordForm(canSetPassword ? 'set' : 'change')
								}
							>
								{canSetPassword ? 'Set Password' : 'Change Password'}
							</Button>
						) : (
							<form
								onSubmit={
									showPasswordForm === 'set'
										? setPasswordForm.handleSubmit(handleSetPassword)
										: changePasswordForm.handleSubmit(handleChangePassword)
								}
								className="space-y-3"
							>
								{showPasswordForm === 'change' && (
									<div>
										<label htmlFor="currentPassword" className="sr-only">
											Current Password
										</label>
										<input
											id="currentPassword"
											type="password"
											placeholder="Current password"
											{...changePasswordForm.register('currentPassword')}
											className="w-full px-3 py-2 border rounded-lg border-kumo-line bg-kumo-base text-kumo-default placeholder-kumo-inactive focus:outline-none focus:ring-2 focus:ring-kumo-ring focus:border-transparent"
										/>
										{changePasswordForm.formState.errors.currentPassword && (
											<p className="mt-1 text-xs text-kumo-danger">
												{
													changePasswordForm.formState.errors.currentPassword
														.message
												}
											</p>
										)}
									</div>
								)}
								<div>
									<label
										htmlFor={
											showPasswordForm === 'set' ? 'password' : 'newPassword'
										}
										className="sr-only"
									>
										{showPasswordForm === 'set' ? 'Password' : 'New Password'}
									</label>
									<input
										id={showPasswordForm === 'set' ? 'password' : 'newPassword'}
										type="password"
										placeholder={
											showPasswordForm === 'set'
												? 'New password'
												: 'New password'
										}
										{...(showPasswordForm === 'set'
											? setPasswordForm.register('password')
											: changePasswordForm.register('newPassword'))}
										className="w-full px-3 py-2 border rounded-lg border-kumo-line bg-kumo-base text-kumo-default placeholder-kumo-inactive focus:outline-none focus:ring-2 focus:ring-kumo-ring focus:border-transparent"
									/>
									{(showPasswordForm === 'set'
										? setPasswordForm.formState.errors.password
										: changePasswordForm.formState.errors.newPassword) && (
										<p className="mt-1 text-xs text-kumo-danger">
											{showPasswordForm === 'set'
												? setPasswordForm.formState.errors.password?.message
												: changePasswordForm.formState.errors.newPassword
														?.message}
										</p>
									)}
								</div>
								<div>
									<label htmlFor="confirmPassword" className="sr-only">
										Confirm Password
									</label>
									<input
										id="confirmPassword"
										type="password"
										placeholder="Confirm password"
										{...setPasswordForm.register('confirmPassword')}
										className="w-full px-3 py-2 border rounded-lg border-kumo-line bg-kumo-base text-kumo-default placeholder-kumo-inactive focus:outline-none focus:ring-2 focus:ring-kumo-ring focus:border-transparent"
									/>
									{(showPasswordForm === 'set'
										? setPasswordForm.formState.errors.confirmPassword
										: changePasswordForm.formState.errors.confirmPassword) && (
										<p className="mt-1 text-xs text-kumo-danger">
											{showPasswordForm === 'set'
												? setPasswordForm.formState.errors.confirmPassword
														?.message
												: changePasswordForm.formState.errors.confirmPassword
														?.message}
										</p>
									)}
								</div>
								<div className="flex gap-2">
									<Button
										type="submit"
										variant="primary"
										size="sm"
										disabled={
											showPasswordForm === 'set'
												? setPasswordForm.formState.isSubmitting
												: changePasswordForm.formState.isSubmitting
										}
									>
										{showPasswordForm === 'set'
											? setPasswordForm.formState.isSubmitting
												? 'Setting...'
												: 'Set Password'
											: changePasswordForm.formState.isSubmitting
												? 'Changing...'
												: 'Change Password'}
									</Button>
									<Button
										type="button"
										variant="secondary"
										size="sm"
										onClick={() => {
											setShowPasswordForm(null)
											setPasswordError('')
											setPasswordForm.reset()
											changePasswordForm.reset()
										}}
									>
										Cancel
									</Button>
								</div>
							</form>
						)}
					</section>
				)}

				{/* API Token */}
				<section className="p-6 space-y-4 border bg-kumo-base border-kumo-line rounded-2xl">
					<div className="flex items-center gap-2 font-semibold text-kumo-default">
						<KeyIcon size={18} weight="duotone" />
						API Token
					</div>

					<div className="flex items-center gap-2">
						<div className="flex-1 px-3 py-2 overflow-hidden font-mono text-sm rounded-lg bg-kumo-control text-kumo-default text-ellipsis whitespace-nowrap">
							{showToken ? apiToken : maskedToken}
						</div>
						<button
							type="button"
							onClick={() => setShowToken(v => !v)}
							className="p-2 transition-colors rounded-lg hover:bg-kumo-hover text-kumo-secondary"
							title={showToken ? 'Hide' : 'Show'}
						>
							{showToken ? <EyeSlashIcon size={16} /> : <EyeIcon size={16} />}
						</button>
						<button
							type="button"
							onClick={handleCopy}
							className="p-2 transition-colors rounded-lg hover:bg-kumo-hover text-kumo-secondary"
							title="Copy"
						>
							<CopyIcon size={16} />
						</button>
					</div>

					{copied && (
						<p className="text-xs text-kumo-success">Copied to clipboard!</p>
					)}
					{rotateError && (
						<p className="text-xs text-kumo-danger">{rotateError}</p>
					)}
					{rotateSuccess && (
						<p className="text-xs text-kumo-success">{rotateSuccess}</p>
					)}

					<div className="flex items-center gap-3 pt-2">
						<Button
							variant="secondary"
							size="sm"
							onClick={handleRotate}
							disabled={rotating}
						>
							{rotating ? 'Rotating…' : 'Rotate Token'}
						</Button>
					</div>

					<div className="px-3 py-2 text-xs rounded-lg text-kumo-inactive bg-kumo-control">
						Use this token in the CLI:{' '}
						<code className="text-kumo-accent">happy-vibecode login</code>, or
						set it in your HTTP requests as{' '}
						<code className="text-kumo-accent">
							Authorization: Bearer {'<token>'}
						</code>
					</div>
				</section>

				{/* Server */}
				{serverUrl && (
					<section className="p-6 space-y-4 border bg-kumo-base border-kumo-line rounded-2xl">
						<div className="flex items-center gap-2 font-semibold text-kumo-default">
							Server URL
						</div>
						<p className="font-mono text-sm text-kumo-default">
							{serverUrl || window.location.origin}
						</p>
					</section>
				)}

				{/* Workspaces */}
				<section className="p-6 border bg-kumo-base border-kumo-line rounded-2xl">
					<WorkspaceSelector
						workspaces={workspaces}
						activeWorkspaceId={activeWorkspaceId}
						onSelect={setActiveWorkspace}
						onAdd={addWorkspace}
						onRemove={removeWorkspace}
					/>
				</section>

				{/* Danger zone */}
				<section className="p-6 space-y-4 border bg-kumo-base border-kumo-danger/30 rounded-2xl">
					<div className="flex items-center gap-2 font-semibold text-kumo-danger">
						<TrashIcon size={18} weight="duotone" />
						Danger Zone
					</div>
					<Text size="sm" variant="secondary">
						Logging out will remove your credentials from this browser.
					</Text>
					<Button variant="destructive" size="sm" onClick={handleLogout}>
						Sign Out
					</Button>
				</section>
			</main>
		</div>
	)
}
