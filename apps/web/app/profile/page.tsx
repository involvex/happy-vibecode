'use client'
import {
	CircleIcon,
	PaletteIcon,
	BellIcon,
	TranslateIcon,
	UserIcon,
	CreditCardIcon,
	LightningIcon,
} from '@phosphor-icons/react'
import type {UserSubscription} from '@happy-vibecode/shared'
import {useRouter, useSearchParams} from 'next/navigation'
import {zodResolver} from '@hookform/resolvers/zod'
import {Button, Text} from '@cloudflare/kumo'
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
	subscription: UserSubscription
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
	const {isAuthed, isLoaded, apiToken, logout, refreshUser} = useAuth()
	const router = useRouter()
	const searchParams = useSearchParams()

	const [profileLoading, setProfileLoading] = useState(true)
	const [subscription, setSubscription] = useState<UserSubscription | null>(
		null,
	)
	const [checkoutLoading, setCheckoutLoading] = useState(false)
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
			Promise.all([
				fetch('/api/user/profile', {
					headers: {Authorization: `Bearer ${apiToken}`},
				}),
				fetch('/api/user/subscription', {
					headers: {Authorization: `Bearer ${apiToken}`},
				}),
			])
				.then(async ([profileRes, subscriptionRes]) => {
					if (!profileRes.ok) {
						throw new Error('Failed to load profile')
					}

					const data = (await profileRes.json()) as UserProfile
					const subscriptionData = subscriptionRes.ok
						? ((await subscriptionRes.json()) as UserSubscription)
						: data.subscription
					return {profile: data, subscription: subscriptionData}
				})
				.then(({profile, subscription}) => {
					profileForm.reset({
						nickname: profile.nickname || '',
						theme: profile.preferences?.theme || 'system',
						notifications: profile.preferences?.notifications ?? true,
						language: profile.preferences?.language || 'en',
					})
					setSubscription(subscription)
				})
				.catch(console.error)
				.finally(() => setProfileLoading(false))
		}
	}, [apiToken, isAuthed, profileForm])

	useEffect(() => {
		const billingState = searchParams.get('billing')
		if (billingState === 'success') {
			setSaveSuccess(
				'Stripe checkout started successfully. Your subscription will update shortly.',
			)
		} else if (billingState === 'canceled') {
			setSaveError('Stripe checkout was canceled before completion.')
		}
	}, [searchParams])

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

	const handleUpgrade = async () => {
		if (!apiToken) return
		setCheckoutLoading(true)
		setSaveError('')
		try {
			const res = await fetch('/api/billing/checkout-session', {
				method: 'POST',
				headers: {Authorization: `Bearer ${apiToken}`},
			})
			const payload = (await res.json()) as {url?: string; error?: string}
			if (!res.ok || !payload.url) {
				throw new Error(payload.error ?? 'Failed to start checkout')
			}
			window.location.assign(payload.url)
		} catch (err) {
			setSaveError((err as Error).message)
		} finally {
			setCheckoutLoading(false)
			void refreshUser()
		}
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

			<main className="max-w-2xl px-6 pt-10 pb-24 mx-auto space-y-6">
				<h1 className="text-2xl font-bold text-kumo-default">Profile</h1>

				{saveSuccess && (
					<div className="px-3 py-2 text-sm border rounded-lg text-kumo-success bg-kumo-success/10 border-kumo-success/20">
						{saveSuccess}
					</div>
				)}

				{saveError && (
					<div className="px-3 py-2 text-sm border rounded-lg text-kumo-danger bg-kumo-danger/10 border-kumo-danger/20">
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
						<section className="p-6 space-y-4 border bg-kumo-base border-kumo-line rounded-2xl">
							<div className="flex items-center gap-2 font-semibold text-kumo-default">
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
									className="w-full px-3 py-2 border rounded-lg border-kumo-line bg-kumo-base text-kumo-default placeholder-kumo-inactive focus:outline-none focus:ring-2 focus:ring-kumo-ring focus:border-transparent"
								/>
								{profileForm.formState.errors.nickname && (
									<p className="mt-1 text-xs text-kumo-danger">
										{profileForm.formState.errors.nickname.message}
									</p>
								)}
							</div>
						</section>

						{/* Theme */}
						<section className="p-6 space-y-4 border bg-kumo-base border-kumo-line rounded-2xl">
							<div className="flex items-center gap-2 font-semibold text-kumo-default">
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
						<section className="p-6 space-y-4 border bg-kumo-base border-kumo-line rounded-2xl">
							<div className="flex items-center gap-2 font-semibold text-kumo-default">
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
						<section className="p-6 space-y-4 border bg-kumo-base border-kumo-line rounded-2xl">
							<div className="flex items-center gap-2 font-semibold text-kumo-default">
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
									className="w-full px-3 py-2 border rounded-lg border-kumo-line bg-kumo-base text-kumo-default focus:outline-none focus:ring-2 focus:ring-kumo-ring focus:border-transparent"
								>
									{LANGUAGES.map(lang => (
										<option key={lang.code} value={lang.code}>
											{lang.label}
										</option>
									))}
								</select>
							</div>
						</section>

						<section className="p-6 space-y-4 border bg-kumo-base border-kumo-line rounded-2xl">
							<div className="flex items-center gap-2 font-semibold text-kumo-default">
								<CreditCardIcon size={18} weight="duotone" />
								Subscription
							</div>
							<Text size="sm" variant="secondary">
								Manage your plan from the web profile. Mobile will read the same
								subscription state later.
							</Text>
							<div className="p-4 space-y-3 border rounded-xl border-kumo-line bg-kumo-elevated">
								<div className="flex items-center justify-between gap-4">
									<div>
										<p className="text-sm text-kumo-secondary">Current plan</p>
										<p className="text-lg font-semibold text-kumo-default">
											{subscription?.isPro ? 'Pro' : 'Free'}
										</p>
									</div>
									<div className="text-right">
										<p className="text-sm text-kumo-secondary">Status</p>
										<p className="text-sm font-medium capitalize text-kumo-default">
											{subscription?.cancelAtPeriodEnd && subscription.isPro
												? 'canceling'
												: (subscription?.status.replace('_', ' ') ??
													'inactive')}
										</p>
									</div>
								</div>
								{subscription?.currentPeriodEnd && (
									<p className="text-sm text-kumo-secondary">
										{subscription.cancelAtPeriodEnd
											? `Your Pro access ends on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}.`
											: `Your current billing period renews on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}.`}
									</p>
								)}
								{subscription?.isPro ? (
									<div className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-kumo-accent/10 text-kumo-default">
										<LightningIcon size={16} weight="duotone" />
										Your account currently has Pro access.
									</div>
								) : (
									<div className="space-y-3">
										<Text size="sm" variant="secondary">
											Upgrade to Pro for €8.99/month when you are ready.
										</Text>
										<Button
											type="button"
											variant="primary"
											onClick={handleUpgrade}
											disabled={checkoutLoading}
										>
											{checkoutLoading
												? 'Opening Checkout...'
												: 'Upgrade to Pro'}
										</Button>
									</div>
								)}
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
