'use client'
import {
	CircleIcon,
	PaletteIcon,
	BellIcon,
	TranslateIcon,
	UserIcon,
} from '@phosphor-icons/react'
import {zodResolver} from '@hookform/resolvers/zod'
import {Button, Text} from '@cloudflare/kumo'
import {useRouter} from 'next/navigation'
import {useEffect, useState} from 'react'
import {useAuth} from '../hooks/useAuth'
import {useForm} from 'react-hook-form'
import {Nav} from '../components/Nav'
import {z} from 'zod'

const updateProfileSchema = z.object({
	nickname: z
		.string()
		.min(1, 'Nickname is required')
		.max(50, 'Nickname must be less than 50 characters')
		.optional(),
	theme: z.enum(['light', 'dark', 'system']),
	notifications: z.boolean(),
	language: z.string().min(2).max(5),
})

type UpdateProfileForm = z.infer<typeof updateProfileSchema>

interface UserProfile {
	email: string | null
	nickname: string | null
	preferences: {
		theme: 'light' | 'dark' | 'system'
		notifications: boolean
		language: string
	} | null
}

const LANGUAGES = [
	{code: 'en', label: 'English'},
	{code: 'es', label: 'Español'},
	{code: 'fr', label: 'Français'},
	{code: 'de', label: 'Deutsch'},
	{code: 'ja', label: '日本語'},
	{code: 'zh', label: '中文'},
]

export default function ProfilePage() {
	const {isAuthed, isLoaded, apiToken, logout} = useAuth()
	const router = useRouter()

	const [profileLoading, setProfileLoading] = useState(true)
	const [saveSuccess, setSaveSuccess] = useState('')
	const [saveError, setSaveError] = useState('')

	const profileForm = useForm<UpdateProfileForm>({
		resolver: zodResolver(updateProfileSchema),
		defaultValues: {
			nickname: '',
			theme: 'system',
			notifications: true,
			language: 'en',
		},
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
					profileForm.reset({
						nickname: data.nickname || '',
						theme: data.preferences?.theme || 'system',
						notifications: data.preferences?.notifications ?? true,
						language: data.preferences?.language || 'en',
					})
				})
				.catch(console.error)
				.finally(() => setProfileLoading(false))
		}
	}, [apiToken, isAuthed, profileForm])

	const handleSubmit = async (data: UpdateProfileForm) => {
		if (!apiToken) return
		setSaveError('')
		try {
			const res = await fetch('/api/user/profile', {
				method: 'PUT',
				headers: {
					Authorization: `Bearer ${apiToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					nickname: data.nickname || null,
					preferences: {
						theme: data.theme,
						notifications: data.notifications,
						language: data.language,
					},
				}),
			})
			if (!res.ok) {
				const err = (await res.json()) as {error?: string}
				throw new Error(err.error ?? 'Failed to update profile')
			}
			const _updated = (await res.json()) as UserProfile
			setSaveSuccess('Profile updated successfully!')
			setTimeout(() => setSaveSuccess(''), 3000)
		} catch (err) {
			setSaveError((err as Error).message)
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

	return (
		<div className="min-h-screen bg-kumo-elevated">
			<Nav onLogout={handleLogout} />

			<main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
				<h1 className="text-2xl font-bold text-kumo-default">Profile</h1>

				{saveSuccess && (
					<div className="text-sm text-kumo-success bg-kumo-success/10 border border-kumo-success/20 rounded-lg px-3 py-2">
						{saveSuccess}
					</div>
				)}

				{saveError && (
					<div className="text-sm text-kumo-danger bg-kumo-danger/10 border border-kumo-danger/20 rounded-lg px-3 py-2">
						{saveError}
					</div>
				)}

				{profileLoading ? (
					<div className="flex items-center justify-center py-10">
						<CircleIcon
							size={24}
							weight="duotone"
							className="text-kumo-inactive animate-spin"
						/>
					</div>
				) : (
					<form
						onSubmit={profileForm.handleSubmit(handleSubmit)}
						className="space-y-6"
					>
						{/* Nickname */}
						<section className="bg-kumo-base border border-kumo-line rounded-2xl p-6 space-y-4">
							<div className="flex items-center gap-2 text-kumo-default font-semibold">
								<UserIcon size={18} weight="duotone" />
								Nickname
							</div>
							<Text size="sm" variant="secondary">
								This is how you'll appear to others.
							</Text>
							<div>
								<label htmlFor="nickname" className="sr-only">
									Nickname
								</label>
								<input
									id="nickname"
									type="text"
									placeholder="Your nickname"
									maxLength={50}
									{...profileForm.register('nickname')}
									className="w-full px-3 py-2 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default placeholder-kumo-inactive focus:outline-none focus:ring-2 focus:ring-kumo-ring focus:border-transparent"
								/>
								{profileForm.formState.errors.nickname && (
									<p className="text-xs text-kumo-danger mt-1">
										{profileForm.formState.errors.nickname.message}
									</p>
								)}
							</div>
						</section>

						{/* Theme */}
						<section className="bg-kumo-base border border-kumo-line rounded-2xl p-6 space-y-4">
							<div className="flex items-center gap-2 text-kumo-default font-semibold">
								<PaletteIcon size={18} weight="duotone" />
								Theme
							</div>
							<Text size="sm" variant="secondary">
								Choose your preferred color scheme.
							</Text>
							<div className="flex gap-3">
								{(['light', 'dark', 'system'] as const).map(theme => (
									<label key={theme} className="flex-1 cursor-pointer">
										<input
											type="radio"
											value={theme}
											{...profileForm.register('theme')}
											className="sr-only"
										/>
										<div
											className={`p-3 rounded-lg border text-center capitalize transition-colors ${
												profileForm.watch('theme') === theme
													? 'border-kumo-accent bg-kumo-accent/10 text-kumo-default'
													: 'border-kumo-line text-kumo-secondary hover:border-kumo-default'
											}`}
										>
											{theme}
										</div>
									</label>
								))}
							</div>
						</section>

						{/* Notifications */}
						<section className="bg-kumo-base border border-kumo-line rounded-2xl p-6 space-y-4">
							<div className="flex items-center gap-2 text-kumo-default font-semibold">
								<BellIcon size={18} weight="duotone" />
								Notifications
							</div>
							<Text size="sm" variant="secondary">
								Receive updates about your agent sessions.
							</Text>
							<label className="flex items-center gap-3 cursor-pointer">
								<input
									type="checkbox"
									{...profileForm.register('notifications')}
									className="w-5 h-5 rounded border-kumo-line text-kumo-accent focus:ring-kumo-ring"
								/>
								<span className="text-kumo-default">Enable notifications</span>
							</label>
						</section>

						{/* Language */}
						<section className="bg-kumo-base border border-kumo-line rounded-2xl p-6 space-y-4">
							<div className="flex items-center gap-2 text-kumo-default font-semibold">
								<TranslateIcon size={18} weight="duotone" />
								Language
							</div>
							<Text size="sm" variant="secondary">
								Select your preferred language.
							</Text>
							<div>
								<label htmlFor="language" className="sr-only">
									Language
								</label>
								<select
									id="language"
									{...profileForm.register('language')}
									className="w-full px-3 py-2 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default focus:outline-none focus:ring-2 focus:ring-kumo-ring focus:border-transparent"
								>
									{LANGUAGES.map(lang => (
										<option key={lang.code} value={lang.code}>
											{lang.label}
										</option>
									))}
								</select>
							</div>
						</section>

						{/* Save Button */}
						<Button
							type="submit"
							variant="primary"
							disabled={profileForm.formState.isSubmitting}
						>
							{profileForm.formState.isSubmitting
								? 'Saving...'
								: 'Save Changes'}
						</Button>
					</form>
				)}
			</main>
		</div>
	)
}
