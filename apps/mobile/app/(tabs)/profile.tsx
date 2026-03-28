import {
	Alert,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	Switch,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {SafeAreaView} from 'react-native-safe-area-context'
import * as WebBrowser from 'expo-web-browser'
import {useAuth} from '../../hooks/useAuth'
import {Ionicons} from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import {useColorScheme} from 'nativewind'
import {useEffect, useState} from 'react'

const COLOR_SCHEME_KEY = 'happy-color-scheme'
const DEFAULT_URL = 'https://happy-vibecode.involvex.workers.dev'

const LANGUAGES = [
	{code: 'en', label: 'English'},
	{code: 'es', label: 'Español'},
	{code: 'fr', label: 'Français'},
	{code: 'de', label: 'Deutsch'},
	{code: 'ja', label: '日本語'},
	{code: 'zh', label: '中文'},
] as const

type ThemePreference = 'light' | 'dark' | 'system'
type SubscriptionStatus =
	| 'inactive'
	| 'trialing'
	| 'active'
	| 'past_due'
	| 'canceled'
	| 'unpaid'

interface UserProfile {
	email: string | null
	nickname: string | null
	preferences: {
		theme: ThemePreference
		notifications: boolean
		language: string
	} | null
	subscription: UserSubscription
}

interface UserSubscription {
	planTier: 'free' | 'pro'
	status: SubscriptionStatus
	stripeCustomerId: string | null
	stripeSubscriptionId: string | null
	stripePriceId: string | null
	currentPeriodEnd: string | null
	cancelAtPeriodEnd: boolean
	updatedAt: string | null
	isPro: boolean
}

export default function ProfileScreen() {
	const {isAuthed, apiToken, userId, serverUrl} = useAuth()
	const {colorScheme, setColorScheme} = useColorScheme()
	const isDark = colorScheme === 'dark'

	const iconColor = isDark ? '#e2e8f0' : '#1e293b'
	const mutedColor = '#94a3b8'
	const placeholderColor = isDark ? '#64748b' : '#94a3b8'

	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [saveMessage, setSaveMessage] = useState('')
	const [saveError, setSaveError] = useState('')
	const [copied, setCopied] = useState(false)

	const [nickname, setNickname] = useState('')
	const [theme, setTheme] = useState<ThemePreference>('system')
	const [notifications, setNotifications] = useState(true)
	const [language, setLanguage] = useState('en')
	const [email, setEmail] = useState<string | null>(null)
	const [subscription, setSubscription] = useState<UserSubscription | null>(
		null,
	)
	const [checkoutLoading, setCheckoutLoading] = useState(false)

	const baseUrl = serverUrl ?? DEFAULT_URL

	const maskedToken = apiToken
		? apiToken.slice(0, 3) + '\u2022'.repeat(12) + apiToken.slice(-3)
		: 'Not available'

	useEffect(() => {
		let cancelled = false

		const fetchProfile = async () => {
			if (!apiToken) return
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

				if (!profileRes.ok) throw new Error('Failed to load profile')
				const profile = (await profileRes.json()) as UserProfile

				if (cancelled) return

				const profileTheme = profile.preferences?.theme ?? 'system'
				setNickname(profile.nickname ?? '')
				setTheme(profileTheme)
				// Apply the loaded theme preference to NativeWind and persist it
				try {
					setColorScheme(profileTheme === 'system' ? 'system' : profileTheme)
					await AsyncStorage.setItem(COLOR_SCHEME_KEY, profileTheme)
				} catch (storageErr) {
					console.error('Failed to persist theme preference:', storageErr)
				}
				setNotifications(profile.preferences?.notifications ?? true)
				setLanguage(profile.preferences?.language ?? 'en')
				setEmail(profile.email)

				if (subRes.ok) {
					const sub = (await subRes.json()) as UserSubscription
					setSubscription(sub)
				} else {
					setSubscription(profile.subscription)
				}
			} catch (err) {
				if (!cancelled) console.error('Profile load error:', err)
			} finally {
				if (!cancelled) setLoading(false)
			}
		}

		fetchProfile()

		return () => {
			cancelled = true
		}
	}, [apiToken, baseUrl, setColorScheme])

	const handleSave = async () => {
		if (!apiToken) return
		setSaveError('')
		setSaveMessage('')
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
			setSaveMessage('Profile updated successfully!')
			setTimeout(() => setSaveMessage(''), 3000)
		} catch (err) {
			setSaveError((err as Error).message)
			setTimeout(() => setSaveError(''), 5000)
		} finally {
			setSaving(false)
		}
	}

	const handleCopyToken = async () => {
		if (!apiToken) return
		await Clipboard.setStringAsync(apiToken)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	const handleThemeToggle = async (scheme: ThemePreference) => {
		setTheme(scheme)
		if (scheme === 'system') {
			await AsyncStorage.removeItem(COLOR_SCHEME_KEY)
		} else {
			setColorScheme(scheme)
			await AsyncStorage.setItem(COLOR_SCHEME_KEY, scheme)
		}
	}

	const handleUpgrade = async () => {
		if (!apiToken) return
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
			await WebBrowser.openBrowserAsync(payload.url)
		} catch (err) {
			setSaveError((err as Error).message)
			setTimeout(() => setSaveError(''), 5000)
		} finally {
			setCheckoutLoading(false)
		}
	}

	if (!isAuthed) {
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
				<View className="items-center justify-center flex-1 px-6">
					<Ionicons name="person-circle-outline" size={64} color={mutedColor} />
					<Text className="mt-4 text-lg font-semibold text-text dark:text-text-dark">
						Sign in to view your profile
					</Text>
					<Text className="mt-1 text-sm text-center text-muted dark:text-muted-dark">
						Go to Settings to sign in or create an account.
					</Text>
				</View>
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
					{saveMessage !== '' && (
						<View className="px-3 py-2 border bg-success/10 border-success/20 rounded-xl">
							<Text className="text-sm text-success">{saveMessage}</Text>
						</View>
					)}

					{saveError !== '' && (
						<View className="px-3 py-2 border bg-error/10 border-error/20 rounded-xl">
							<Text className="text-sm text-error">{saveError}</Text>
						</View>
					)}

					{loading ? (
						<View className="items-center justify-center py-10">
							<Ionicons name="reload-outline" size={24} color={mutedColor} />
							<Text className="mt-2 text-sm text-muted dark:text-muted-dark">
								Loading profile...
							</Text>
						</View>
					) : (
						<>
							{/* User Info */}
							<View className="gap-3 p-4 border bg-card dark:bg-card-dark border-border dark:border-border-dark rounded-2xl">
								<View className="flex-row items-center gap-2">
									<Ionicons name="person-outline" size={18} color={iconColor} />
									<Text className="font-semibold text-text dark:text-text-dark">
										Account
									</Text>
								</View>

								<View className="gap-2">
									<View>
										<Text className="text-muted dark:text-muted-dark text-xs mb-0.5">
											Email
										</Text>
										<Text className="text-sm text-text dark:text-text-dark">
											{email ?? 'Not available'}
										</Text>
									</View>

									<View>
										<Text className="text-muted dark:text-muted-dark text-xs mb-0.5">
											User ID
										</Text>
										<Text className="font-mono text-sm text-text dark:text-text-dark">
											{userId ?? 'Not available'}
										</Text>
									</View>

									<View>
										<Text className="text-muted dark:text-muted-dark text-xs mb-0.5">
											API Token
										</Text>
										<View className="flex-row items-center gap-2">
											<Text className="flex-1 font-mono text-sm text-text dark:text-text-dark">
												{maskedToken}
											</Text>
											<TouchableOpacity
												className="flex-row items-center gap-1 bg-surface dark:bg-surface-dark px-3 py-1.5 rounded-lg"
												onPress={handleCopyToken}
											>
												<Ionicons
													name={copied ? 'checkmark-outline' : 'copy-outline'}
													size={14}
													color={copied ? '#22c55e' : mutedColor}
												/>
												<Text
													className={`text-xs font-medium ${copied ? 'text-success' : 'text-muted dark:text-muted-dark'}`}
												>
													{copied ? 'Copied' : 'Copy'}
												</Text>
											</TouchableOpacity>
										</View>
									</View>
								</View>
							</View>

							{/* Nickname */}
							<View className="gap-3 p-4 border bg-card dark:bg-card-dark border-border dark:border-border-dark rounded-2xl">
								<View className="flex-row items-center gap-2">
									<Ionicons name="at-outline" size={18} color={iconColor} />
									<Text className="font-semibold text-text dark:text-text-dark">
										Nickname
									</Text>
								</View>
								<Text className="text-xs text-muted dark:text-muted-dark">
									This is how you&apos;ll appear to others.
								</Text>
								<View className="flex-row items-center gap-2">
									<TextInput
										className="flex-1 px-4 py-3 text-sm border bg-surface dark:bg-surface-dark border-border dark:border-border-dark rounded-xl text-text dark:text-text-dark"
										placeholder="Your nickname"
										placeholderTextColor={placeholderColor}
										value={nickname}
										onChangeText={setNickname}
										maxLength={50}
										autoCapitalize="none"
									/>
									<TouchableOpacity
										className={`px-4 py-3 rounded-xl ${saving ? 'bg-border dark:bg-border-dark' : 'bg-primary'}`}
										onPress={handleSave}
										disabled={saving}
									>
										<Text className="text-sm font-semibold text-white">
											{saving ? 'Saving...' : 'Save'}
										</Text>
									</TouchableOpacity>
								</View>
							</View>

							{/* Theme */}
							<View className="gap-3">
								<Text className="text-sm font-semibold tracking-wide uppercase text-text dark:text-text-dark">
									Appearance
								</Text>
								<View className="gap-3 p-4 border bg-card dark:bg-card-dark border-border dark:border-border-dark rounded-2xl">
									<View className="flex-row items-center gap-2">
										<Ionicons
											name="color-palette-outline"
											size={18}
											color={iconColor}
										/>
										<Text className="font-semibold text-text dark:text-text-dark">
											Theme
										</Text>
									</View>
									<Text className="text-xs text-muted dark:text-muted-dark">
										Choose your preferred color scheme.
									</Text>
									<View className="flex-row gap-2">
										{(
											['light', 'dark', 'system'] as readonly ThemePreference[]
										).map(t => (
											<TouchableOpacity
												key={t}
												className={`flex-1 py-3 rounded-xl border items-center ${
													theme === t
														? 'border-primary bg-primary/10'
														: 'border-border dark:border-border-dark'
												}`}
												onPress={() => handleThemeToggle(t)}
											>
												<Ionicons
													name={
														t === 'light'
															? 'sunny-outline'
															: t === 'dark'
																? 'moon-outline'
																: 'phone-portrait-outline'
													}
													size={18}
													color={theme === t ? '#7c3aed' : mutedColor}
												/>
												<Text
													className={`text-xs font-medium mt-1 capitalize ${
														theme === t
															? 'text-primary'
															: 'text-muted dark:text-muted-dark'
													}`}
												>
													{t}
												</Text>
											</TouchableOpacity>
										))}
									</View>
								</View>
							</View>

							{/* Notifications */}
							<View className="gap-3">
								<Text className="text-sm font-semibold tracking-wide uppercase text-text dark:text-text-dark">
									Preferences
								</Text>
								<View className="flex-row items-center justify-between px-4 py-3 border bg-card dark:bg-card-dark border-border dark:border-border-dark rounded-2xl">
									<View className="flex-row items-center gap-3">
										<Ionicons
											name="notifications-outline"
											size={20}
											color={iconColor}
										/>
										<View>
											<Text className="text-sm font-medium text-text dark:text-text-dark">
												Notifications
											</Text>
											<Text className="text-xs text-muted dark:text-muted-dark">
												Receive updates about your agent sessions.
											</Text>
										</View>
									</View>
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
									<Ionicons
										name="language-outline"
										size={18}
										color={iconColor}
									/>
									<Text className="font-semibold text-text dark:text-text-dark">
										Language
									</Text>
								</View>
								<Text className="text-xs text-muted dark:text-muted-dark">
									Select your preferred language.
								</Text>
								<ScrollView
									horizontal
									showsHorizontalScrollIndicator={false}
									contentContainerStyle={{gap: 8}}
								>
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
												className={`text-sm font-medium ${
													language === lang.code
														? 'text-primary'
														: 'text-muted dark:text-muted-dark'
												}`}
											>
												{lang.label}
											</Text>
										</TouchableOpacity>
									))}
								</ScrollView>
							</View>

							{/* Subscription */}
							<View className="gap-3">
								<Text className="text-sm font-semibold tracking-wide uppercase text-text dark:text-text-dark">
									Subscription
								</Text>
								<View className="gap-3 p-4 border bg-card dark:bg-card-dark border-border dark:border-border-dark rounded-2xl">
									<View className="flex-row items-center gap-2">
										<Ionicons name="card-outline" size={18} color={iconColor} />
										<Text className="font-semibold text-text dark:text-text-dark">
											Plan
										</Text>
										<View
											className={`px-2 py-0.5 rounded ${
												subscription?.isPro
													? 'bg-primary/10'
													: 'bg-surface dark:bg-surface-dark'
											}`}
										>
											<Text
												className={`text-xs font-semibold ${
													subscription?.isPro
														? 'text-primary'
														: 'text-muted dark:text-muted-dark'
												}`}
											>
												{subscription?.isPro ? 'Pro' : 'Free'}
											</Text>
										</View>
									</View>

									{subscription && (
										<View className="flex-row items-center justify-between">
											<Text className="text-xs text-muted dark:text-muted-dark">
												Status
											</Text>
											<Text className="text-xs font-medium capitalize text-text dark:text-text-dark">
												{subscription.cancelAtPeriodEnd && subscription.isPro
													? 'canceling'
													: subscription.status.replace('_', ' ')}
											</Text>
										</View>
									)}

									{subscription?.currentPeriodEnd && (
										<Text className="text-xs text-muted dark:text-muted-dark">
											{subscription.cancelAtPeriodEnd
												? `Your Pro access ends on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}.`
												: `Your current billing period renews on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}.`}
										</Text>
									)}

									{subscription?.isPro ? (
										<View className="flex-row items-center gap-2 px-3 py-2 bg-primary/10 rounded-xl">
											<Ionicons
												name="flash-outline"
												size={16}
												color="#7c3aed"
											/>
											<Text className="text-sm font-medium text-primary">
												Your account currently has Pro access.
											</Text>
										</View>
									) : (
										<TouchableOpacity
											className={`bg-primary rounded-xl py-3 items-center flex-row justify-center gap-2 ${checkoutLoading ? 'opacity-60' : ''}`}
											onPress={handleUpgrade}
											disabled={checkoutLoading}
										>
											<Ionicons
												name="flash-outline"
												size={16}
												color="#ffffff"
											/>
											<Text className="font-semibold text-white">
												{checkoutLoading
													? 'Opening Checkout...'
													: 'Upgrade to Pro'}
											</Text>
										</TouchableOpacity>
									)}
								</View>
							</View>

							{/* Save All */}
							<TouchableOpacity
								className={`rounded-xl py-3.5 items-center ${saving ? 'bg-border dark:bg-border-dark' : 'bg-primary'}`}
								onPress={handleSave}
								disabled={saving}
							>
								<Text className="font-semibold text-white">
									{saving ? 'Saving...' : 'Save Changes'}
								</Text>
							</TouchableOpacity>

							{/* Bottom spacing */}
							<View className="h-8" />
						</>
					)}
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	)
}
