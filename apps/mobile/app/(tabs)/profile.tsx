import {
	Alert,
	KeyboardAvoidingView,
	Linking,
	Platform,
	ScrollView,
	Switch,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native'
import {SafeAreaView} from 'react-native-safe-area-context'
import {useCallback, useEffect, useState} from 'react'
import {useAuth} from '../../hooks/useAuth'
import {Ionicons} from '@expo/vector-icons'
import {useColorScheme} from 'nativewind'

const LANGUAGES = [
	{code: 'en', label: 'English'},
	{code: 'es', label: 'Español'},
	{code: 'fr', label: 'Français'},
	{code: 'de', label: 'Deutsch'},
	{code: 'ja', label: '日本語'},
	{code: 'zh', label: '中文'},
]

const THEMES = ['light', 'dark', 'system'] as const
type Theme = (typeof THEMES)[number]

interface UserSubscription {
	planTier: 'free' | 'pro'
	status:
		| 'inactive'
		| 'trialing'
		| 'active'
		| 'past_due'
		| 'canceled'
		| 'unpaid'
	stripeCustomerId: string | null
	stripeSubscriptionId: string | null
	stripePriceId: string | null
	currentPeriodEnd: string | null
	cancelAtPeriodEnd: boolean
	updatedAt: string | null
	isPro: boolean
}

interface UserProfile {
	email: string | null
	nickname: string | null
	preferences: {
		theme: Theme
		notifications: boolean
		language: string
	} | null
	subscription: UserSubscription
}

export default function ProfileScreen() {
	const {apiToken, serverUrl} = useAuth()
	const {colorScheme} = useColorScheme()
	const isDark = colorScheme === 'dark'

	const mutedColor = '#94a3b8'
	const placeholderColor = isDark ? '#64748b' : '#94a3b8'

	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [checkoutLoading, setCheckoutLoading] = useState(false)

	const [nickname, setNickname] = useState('')
	const [theme, setTheme] = useState<Theme>('system')
	const [notifications, setNotifications] = useState(true)
	const [language, setLanguage] = useState('en')
	const [subscription, setSubscription] = useState<UserSubscription | null>(
		null,
	)

	const baseUrl = serverUrl ?? ''

	const loadProfile = useCallback(async () => {
		if (!apiToken || !baseUrl) {
			setLoading(false)
			return
		}
		setLoading(true)
		try {
			const [profileRes, subRes] = await Promise.all([
				fetch(`${baseUrl}/api/user/profile`, {
					headers: {Authorization: `Bearer ${apiToken}`},
				}),
				fetch(`${baseUrl}/api/user/subscription`, {
					headers: {Authorization: `Bearer ${apiToken}`},
				}),
			])
			if (!profileRes.ok) {
				throw new Error('Failed to load profile')
			}
			const profile = (await profileRes.json()) as UserProfile
			setNickname(profile.nickname ?? '')
			setTheme(profile.preferences?.theme ?? 'system')
			setNotifications(profile.preferences?.notifications ?? true)
			setLanguage(profile.preferences?.language ?? 'en')
			setSubscription(
				subRes.ok
					? ((await subRes.json()) as UserSubscription)
					: profile.subscription,
			)
		} catch (err) {
			Alert.alert('Error', (err as Error).message)
		} finally {
			setLoading(false)
		}
	}, [apiToken, baseUrl])

	useEffect(() => {
		loadProfile()
	}, [loadProfile])

	const handleSave = async () => {
		if (!apiToken || !baseUrl) return
		setSaving(true)
		try {
			const res = await fetch(`${baseUrl}/api/user/profile`, {
				method: 'PUT',
				headers: {
					Authorization: `Bearer ${apiToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					nickname: nickname.trim() || null,
					preferences: {theme, notifications, language},
				}),
			})
			if (!res.ok) {
				const err = (await res.json()) as {error?: string}
				throw new Error(err.error ?? 'Failed to update profile')
			}
			Alert.alert('Saved', 'Profile updated successfully.')
		} catch (err) {
			Alert.alert('Error', (err as Error).message)
		} finally {
			setSaving(false)
		}
	}

	const handleUpgrade = async () => {
		if (!apiToken || !baseUrl) return
		setCheckoutLoading(true)
		try {
			const res = await fetch(`${baseUrl}/api/billing/checkout-session`, {
				method: 'POST',
				headers: {Authorization: `Bearer ${apiToken}`},
			})
			const payload = (await res.json()) as {url?: string; error?: string}
			if (!res.ok || !payload.url) {
				throw new Error(payload.error ?? 'Failed to start checkout')
			}
			await Linking.openURL(payload.url)
		} catch (err) {
			Alert.alert('Error', (err as Error).message)
		} finally {
			setCheckoutLoading(false)
			loadProfile()
		}
	}

	if (loading) {
		return (
			<SafeAreaView
				className="flex-1 items-center justify-center bg-surface dark:bg-surface-dark"
				edges={['top']}
			>
				<Text className="text-muted dark:text-muted-dark">Loading...</Text>
			</SafeAreaView>
		)
	}

	return (
		<SafeAreaView
			className="flex-1 bg-surface dark:bg-surface-dark"
			edges={['top']}
		>
			<View className="px-4 py-3 border-b border-border dark:border-border-dark">
				<Text className="text-lg font-semibold text-text dark:text-text-dark">
					Profile
				</Text>
			</View>

			<KeyboardAvoidingView
				className="flex-1"
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			>
				<ScrollView
					className="flex-1"
					contentContainerStyle={{padding: 16, gap: 16}}
					keyboardShouldPersistTaps="handled"
					keyboardDismissMode="on-drag"
				>
					{/* Nickname */}
					<View className="gap-3 p-4 border bg-card dark:bg-card-dark border-border dark:border-border-dark rounded-2xl">
						<View className="flex-row items-center gap-2">
							<Ionicons name="person-outline" size={18} color={mutedColor} />
							<Text className="font-semibold text-text dark:text-text-dark">
								Nickname
							</Text>
						</View>
						<Text className="text-xs text-muted dark:text-muted-dark">
							{"This is how you'll appear to others."}
						</Text>
						<TextInput
							className="px-4 py-3 text-sm border bg-surface dark:bg-surface-dark border-border dark:border-border-dark rounded-xl text-text dark:text-text-dark"
							placeholder="Your nickname"
							placeholderTextColor={placeholderColor}
							value={nickname}
							onChangeText={setNickname}
							maxLength={50}
						/>
					</View>

					{/* Theme */}
					<View className="gap-3 p-4 border bg-card dark:bg-card-dark border-border dark:border-border-dark rounded-2xl">
						<View className="flex-row items-center gap-2">
							<Ionicons
								name="color-palette-outline"
								size={18}
								color={mutedColor}
							/>
							<Text className="font-semibold text-text dark:text-text-dark">
								Theme
							</Text>
						</View>
						<Text className="text-xs text-muted dark:text-muted-dark">
							Choose your preferred color scheme.
						</Text>
						<View className="flex-row gap-3">
							{THEMES.map(t => (
								<TouchableOpacity
									key={t}
									className={`flex-1 py-3 rounded-xl border items-center ${
										theme === t
											? 'border-primary bg-primary/10'
											: 'border-border dark:border-border-dark'
									}`}
									onPress={() => setTheme(t)}
								>
									<Text
										className={`text-sm capitalize ${
											theme === t
												? 'text-primary font-semibold'
												: 'text-muted dark:text-muted-dark'
										}`}
									>
										{t}
									</Text>
								</TouchableOpacity>
							))}
						</View>
					</View>

					{/* Notifications */}
					<View className="gap-3 p-4 border bg-card dark:bg-card-dark border-border dark:border-border-dark rounded-2xl">
						<View className="flex-row items-center gap-2">
							<Ionicons
								name="notifications-outline"
								size={18}
								color={mutedColor}
							/>
							<Text className="font-semibold text-text dark:text-text-dark">
								Notifications
							</Text>
						</View>
						<Text className="text-xs text-muted dark:text-muted-dark">
							Receive updates about your agent sessions.
						</Text>
						<View className="flex-row items-center justify-between">
							<Text className="text-sm text-text dark:text-text-dark">
								Enable notifications
							</Text>
							<Switch
								value={notifications}
								onValueChange={setNotifications}
								trackColor={{false: '#e2e8f0', true: '#3b82f6'}}
								thumbColor="#ffffff"
							/>
						</View>
					</View>

					{/* Language */}
					<View className="gap-3 p-4 border bg-card dark:bg-card-dark border-border dark:border-border-dark rounded-2xl">
						<View className="flex-row items-center gap-2">
							<Ionicons name="language-outline" size={18} color={mutedColor} />
							<Text className="font-semibold text-text dark:text-text-dark">
								Language
							</Text>
						</View>
						<Text className="text-xs text-muted dark:text-muted-dark">
							Select your preferred language.
						</Text>
						<View className="flex-row flex-wrap gap-2">
							{LANGUAGES.map(lang => (
								<TouchableOpacity
									key={lang.code}
									className={`px-4 py-2 rounded-xl border ${
										language === lang.code
											? 'border-primary bg-primary/10'
											: 'border-border dark:border-border-dark'
									}`}
									onPress={() => setLanguage(lang.code)}
								>
									<Text
										className={`text-sm ${
											language === lang.code
												? 'text-primary font-semibold'
												: 'text-muted dark:text-muted-dark'
										}`}
									>
										{lang.label}
									</Text>
								</TouchableOpacity>
							))}
						</View>
					</View>

					{/* Subscription */}
					<View className="gap-3 p-4 border bg-card dark:bg-card-dark border-border dark:border-border-dark rounded-2xl">
						<View className="flex-row items-center gap-2">
							<Ionicons name="card-outline" size={18} color={mutedColor} />
							<Text className="font-semibold text-text dark:text-text-dark">
								Subscription
							</Text>
						</View>
						<Text className="text-xs text-muted dark:text-muted-dark">
							Manage your plan from the profile tab.
						</Text>
						<View className="gap-2 p-4 border border-border dark:border-border-dark rounded-xl bg-surface dark:bg-surface-dark">
							<View className="flex-row items-center justify-between">
								<View>
									<Text className="text-xs text-muted dark:text-muted-dark">
										Current plan
									</Text>
									<Text className="text-lg font-semibold text-text dark:text-text-dark">
										{subscription?.isPro ? 'Pro' : 'Free'}
									</Text>
								</View>
								<View className="items-end">
									<Text className="text-xs text-muted dark:text-muted-dark">
										Status
									</Text>
									<Text className="text-sm font-medium capitalize text-text dark:text-text-dark">
										{subscription?.cancelAtPeriodEnd && subscription.isPro
											? 'canceling'
											: (subscription?.status.replace('_', ' ') ?? 'inactive')}
									</Text>
								</View>
							</View>
							{subscription?.currentPeriodEnd && (
								<Text className="text-xs text-muted dark:text-muted-dark">
									{subscription.cancelAtPeriodEnd
										? `Your Pro access ends on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}.`
										: `Your current billing period renews on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}.`}
								</Text>
							)}
							{subscription?.isPro ? (
								<View className="flex-row items-center gap-2 px-3 py-2 rounded-lg bg-primary/10">
									<Ionicons name="flash-outline" size={16} color="#3b82f6" />
									<Text className="text-sm text-text dark:text-text-dark">
										Your account currently has Pro access.
									</Text>
								</View>
							) : (
								<View className="gap-3">
									<Text className="text-xs text-muted dark:text-muted-dark">
										Upgrade to Pro for €8.99/month when you are ready.
									</Text>
									<TouchableOpacity
										className={`rounded-xl py-3 items-center ${checkoutLoading ? 'opacity-60' : ''}`}
										style={{backgroundColor: '#7c3aed'}}
										onPress={handleUpgrade}
										disabled={checkoutLoading}
									>
										<Text className="text-sm font-semibold text-white">
											{checkoutLoading
												? 'Opening Checkout...'
												: 'Upgrade to Pro'}
										</Text>
									</TouchableOpacity>
								</View>
							)}
						</View>
					</View>

					{/* Save Button */}
					<TouchableOpacity
						className={`rounded-xl py-3 items-center ${saving ? 'opacity-60' : ''}`}
						style={{backgroundColor: '#7c3aed'}}
						onPress={handleSave}
						disabled={saving}
					>
						<Text className="font-semibold text-white">
							{saving ? 'Saving...' : 'Save Changes'}
						</Text>
					</TouchableOpacity>

					{/* Bottom spacing */}
					<View className="h-8" />
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	)
}
