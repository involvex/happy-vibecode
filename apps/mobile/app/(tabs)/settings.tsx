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
import {usePushNotifications} from '../../hooks/usePushNotifications'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {usePromptPresets} from '../../hooks/usePromptPresets'
import {SafeAreaView} from 'react-native-safe-area-context'
import {useWorkspaces} from '../../hooks/useWorkspaces'
import {useBiometric} from '../../hooks/useBiometric'
import {useAppLock} from '../../hooks/useAppLock'
import {authClient} from '../../lib/auth-client'
import {useAuth} from '../../hooks/useAuth'
import {Ionicons} from '@expo/vector-icons'
import {useColorScheme} from 'nativewind'
import {useRouter} from 'expo-router'
import {useState} from 'react'

const DEFAULT_URL = 'https://happy-vibecode.involvex.workers.dev'
const COLOR_SCHEME_KEY = 'happy-color-scheme'

export default function SettingsScreen() {
	const {isAuthed, userId, serverUrl, login, logout, setServerUrl} = useAuth()
	const {
		workspaces,
		activeWorkspaceId,
		addWorkspace,
		removeWorkspace,
		setActiveWorkspace,
	} = useWorkspaces()
	const {presets, addPreset, removePreset, resetToDefaults} = usePromptPresets()
	const {colorScheme, setColorScheme} = useColorScheme()
	const {isAvailable: biometricAvailable} = useBiometric()
	const {biometricEnabled, setBiometricEnabled} = useAppLock()
	const {requestPermissions, permissionStatus} = usePushNotifications()
	const router = useRouter()
	const isDark = colorScheme === 'dark'

	const iconColor = isDark ? '#e2e8f0' : '#1e293b'
	const mutedColor = '#94a3b8'
	const placeholderColor = isDark ? '#64748b' : '#94a3b8'

	const [githubLoading, setGithubLoading] = useState(false)

	const handleGithubSignIn = async () => {
		setGithubLoading(true)
		try {
			await authClient.signIn.social({
				provider: 'github',
				callbackURL: 'happy-vibecode://',
			})
		} catch (err) {
			Alert.alert('Error', (err as Error).message)
		} finally {
			setGithubLoading(false)
		}
	}

	const [tokenInput, setTokenInput] = useState('')
	const [userIdInput, setUserIdInput] = useState('')
	const [urlInput, setUrlInput] = useState(serverUrl ?? DEFAULT_URL)
	const [tokenVisible, setTokenVisible] = useState(false)
	const [saving, setSaving] = useState(false)

	const [emailInput, setEmailInput] = useState('')
	const [passwordInput, setPasswordInput] = useState('')
	const [loginMode, setLoginMode] = useState<'token' | 'password'>('token')
	const [loginLoading, setLoginLoading] = useState(false)

	const [showAddWorkspace, setShowAddWorkspace] = useState(false)
	const [newWsName, setNewWsName] = useState('')
	const [newWsPath, setNewWsPath] = useState('')
	const [newWsProvider, setNewWsProvider] = useState('')
	const [newWsModel, setNewWsModel] = useState('')

	const [showAddPreset, setShowAddPreset] = useState(false)
	const [newPresetLabel, setNewPresetLabel] = useState('')
	const [newPresetText, setNewPresetText] = useState('')

	const handleThemeToggle = async (value: boolean) => {
		const scheme = value ? 'dark' : 'light'
		setColorScheme(scheme)
		await AsyncStorage.setItem(COLOR_SCHEME_KEY, scheme)
	}

	const handleSave = async () => {
		const token = tokenInput.trim()
		const uid = userIdInput.trim()
		const url = urlInput.trim() || DEFAULT_URL
		if (!token || !uid) {
			Alert.alert('Required', 'Please enter both API token and user ID.')
			return
		}
		setSaving(true)
		try {
			await login(token, uid, url)
			setTokenInput('')
			setUserIdInput('')
			Alert.alert('Saved', 'Credentials saved.')
		} catch {
			Alert.alert('Error', 'Failed to save credentials.')
		} finally {
			setSaving(false)
		}
	}

	const handleUpdateUrl = async () => {
		const url = urlInput.trim() || DEFAULT_URL
		await setServerUrl(url)
		Alert.alert('Saved', 'Server URL updated.')
	}

	const handlePasswordLogin = async () => {
		const email = emailInput.trim()
		const password = passwordInput.trim()
		const url = urlInput.trim() || DEFAULT_URL
		if (!email || !password) {
			Alert.alert('Required', 'Please enter both email and password.')
			return
		}
		setLoginLoading(true)
		try {
			const res = await fetch(`${url}/api/auth/login`, {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({email, password}),
			})
			if (!res.ok) {
				const data = (await res.json()) as {error?: string}
				throw new Error(data.error ?? 'Login failed')
			}
			const data = (await res.json()) as {id: string; apiToken: string}
			await login(data.apiToken, data.id, url)
			setEmailInput('')
			setPasswordInput('')
			Alert.alert('Success', 'Signed in.')
		} catch (err) {
			Alert.alert('Error', (err as Error).message)
		} finally {
			setLoginLoading(false)
		}
	}

	const handleLogout = () => {
		Alert.alert('Sign Out', 'Remove your stored credentials?', [
			{text: 'Cancel', style: 'cancel'},
			{
				text: 'Sign Out',
				style: 'destructive',
				onPress: logout,
			},
		])
	}

	const handleAddWorkspace = async () => {
		if (!newWsName.trim() || !newWsPath.trim()) {
			Alert.alert('Required', 'Please enter workspace name and path.')
			return
		}
		await addWorkspace({
			name: newWsName.trim(),
			path: newWsPath.trim(),
			defaultProvider: newWsProvider || undefined,
			defaultModel: newWsModel || undefined,
		})
		setNewWsName('')
		setNewWsPath('')
		setNewWsProvider('')
		setNewWsModel('')
		setShowAddWorkspace(false)
		Alert.alert('Saved', 'Workspace added.')
	}

	const handleRemoveWorkspace = (id: string, name: string) => {
		Alert.alert('Remove Workspace', `Remove "${name}"?`, [
			{text: 'Cancel', style: 'cancel'},
			{
				text: 'Remove',
				style: 'destructive',
				onPress: () => removeWorkspace(id),
			},
		])
	}

	const handleAddPreset = async () => {
		if (!newPresetLabel.trim() || !newPresetText.trim()) {
			Alert.alert('Required', 'Please enter both label and prompt text.')
			return
		}
		await addPreset(newPresetLabel.trim(), newPresetText.trim())
		setNewPresetLabel('')
		setNewPresetText('')
		setShowAddPreset(false)
	}

	const handleResetPresets = () => {
		Alert.alert(
			'Reset Presets',
			'This will restore the default presets and remove any custom ones.',
			[
				{text: 'Cancel', style: 'cancel'},
				{text: 'Reset', style: 'destructive', onPress: resetToDefaults},
			],
		)
	}

	return (
		<SafeAreaView
			className="flex-1 bg-surface dark:bg-surface-dark"
			edges={['top']}
		>
			<View className="px-4 py-3 border-b border-border dark:border-border-dark">
				<Text className="text-xl font-bold text-text dark:text-text-dark">
					Settings
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
					{/* Status card */}
					<View className="bg-card dark:bg-card-dark border border-border dark:border-border-dark rounded-2xl p-4">
						<View className="flex-row items-center gap-2 mb-2">
							<View
								className={`w-2.5 h-2.5 rounded-full ${isAuthed ? 'bg-success' : 'bg-error'}`}
							/>
							<Text className="text-text dark:text-text-dark font-semibold">
								{isAuthed ? 'Signed in' : 'Not signed in'}
							</Text>
						</View>
						{isAuthed && (
							<>
								<Text className="text-muted dark:text-muted-dark text-xs">
									User ID: {userId}
								</Text>
								<Text className="text-muted dark:text-muted-dark text-xs mt-0.5">
									Token: {'•'.repeat(12)}
								</Text>
								<TouchableOpacity
									className="mt-3 rounded-xl py-2.5 items-center bg-error/10 border border-error/30"
									onPress={handleLogout}
								>
									<Text className="text-error font-semibold text-sm">
										Sign Out
									</Text>
								</TouchableOpacity>
							</>
						)}
					</View>

					{/* Appearance */}
					<View className="gap-3">
						<Text className="text-xs font-bold text-muted dark:text-muted-dark uppercase tracking-widest">
							Appearance
						</Text>
						<View className="bg-card dark:bg-card-dark border border-border dark:border-border-dark rounded-2xl px-4 py-3 flex-row items-center justify-between">
							<View className="flex-row items-center gap-3">
								<Text className="text-xl">{isDark ? '🌙' : '☀️'}</Text>
								<View>
									<Text className="text-text dark:text-text-dark font-medium text-sm">
										Dark Mode
									</Text>
									<Text className="text-muted dark:text-muted-dark text-xs">
										{isDark ? 'Dark theme active' : 'Light theme active'}
									</Text>
								</View>
							</View>
							<Switch
								value={isDark}
								onValueChange={handleThemeToggle}
								trackColor={{
									false: isDark ? '#2a2a4a' : '#e2e8f0',
									true: '#7c3aed',
								}}
								thumbColor="#ffffff"
							/>
						</View>
					</View>

					{/* Security */}
					<View className="gap-3">
						<Text className="text-xs font-bold text-muted dark:text-muted-dark uppercase tracking-widest">
							Security
						</Text>
						{biometricAvailable && (
							<View className="bg-card dark:bg-card-dark border border-border dark:border-border-dark rounded-2xl px-4 py-3 flex-row items-center justify-between">
								<View className="flex-row items-center gap-3">
									<Text className="text-xl">🔐</Text>
									<View>
										<Text className="text-text dark:text-text-dark font-medium text-sm">
											Biometric Lock
										</Text>
										<Text className="text-muted dark:text-muted-dark text-xs">
											{biometricEnabled
												? 'App requires biometric to unlock'
												: 'Unlock with biometrics'}
										</Text>
									</View>
								</View>
								<Switch
									value={biometricEnabled}
									onValueChange={setBiometricEnabled}
									trackColor={{
										false: isDark ? '#2a2a4a' : '#e2e8f0',
										true: '#7c3aed',
									}}
									thumbColor="#ffffff"
								/>
							</View>
						)}
						<View className="bg-card dark:bg-card-dark border border-border dark:border-border-dark rounded-2xl px-4 py-3 flex-row items-center justify-between">
							<View className="flex-row items-center gap-3">
								<Text className="text-xl">🔔</Text>
								<View>
									<Text className="text-text dark:text-text-dark font-medium text-sm">
										Push Notifications
									</Text>
									<Text className="text-muted dark:text-muted-dark text-xs">
										{permissionStatus === 'granted'
											? 'Enabled'
											: permissionStatus === 'denied'
												? 'Denied — enable in system settings'
												: 'Not configured'}
									</Text>
								</View>
							</View>
							{permissionStatus !== 'granted' && (
								<TouchableOpacity
									className="bg-primary rounded-lg px-3 py-1.5"
									onPress={requestPermissions}
								>
									<Text className="text-white text-xs font-semibold">
										Enable
									</Text>
								</TouchableOpacity>
							)}
						</View>
					</View>

					{/* Templates link */}
					{isAuthed && (
						<View className="gap-3">
							<Text className="text-xs font-bold text-muted dark:text-muted-dark uppercase tracking-widest">
								Templates
							</Text>
							<TouchableOpacity
								className="bg-card dark:bg-card-dark border border-border dark:border-border-dark rounded-2xl px-4 py-3 flex-row items-center justify-between"
								onPress={() => router.push('/templates' as never)}
							>
								<View className="flex-row items-center gap-3">
									<Text className="text-xl">📋</Text>
									<View>
										<Text className="text-text dark:text-text-dark font-medium text-sm">
											Agent Templates
										</Text>
										<Text className="text-muted dark:text-muted-dark text-xs">
											Create and manage reusable agent configs
										</Text>
									</View>
								</View>
								<Ionicons
									name="chevron-forward"
									size={18}
									color="#94a3b8"
								/>
							</TouchableOpacity>
						</View>
					)}

					{/* Prompt Presets */}
					<View className="gap-3">
						<View className="flex-row items-center justify-between">
							<Text className="text-xs font-bold text-muted dark:text-muted-dark uppercase tracking-widest">
								Prompt Presets
							</Text>
							<View className="flex-row gap-3">
								<TouchableOpacity onPress={handleResetPresets}>
									<Text className="text-muted dark:text-muted-dark text-xs font-medium">
										Reset
									</Text>
								</TouchableOpacity>
								<TouchableOpacity onPress={() => setShowAddPreset(v => !v)}>
									<Text className="text-primary text-sm font-medium">
										{showAddPreset ? 'Cancel' : '+ Add'}
									</Text>
								</TouchableOpacity>
							</View>
						</View>

						{showAddPreset && (
							<View className="bg-card dark:bg-card-dark border border-border dark:border-border-dark rounded-xl p-4 gap-3">
								<TextInput
									className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl px-4 py-3 text-text dark:text-text-dark text-sm"
									placeholder="Label (e.g. Write README)"
									placeholderTextColor={placeholderColor}
									value={newPresetLabel}
									onChangeText={setNewPresetLabel}
								/>
								<TextInput
									className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl px-4 py-3 text-text dark:text-text-dark text-sm"
									placeholder="Prompt text…"
									placeholderTextColor={placeholderColor}
									value={newPresetText}
									onChangeText={setNewPresetText}
									multiline
									numberOfLines={3}
								/>
								<TouchableOpacity
									className="bg-primary rounded-xl py-3 items-center"
									onPress={handleAddPreset}
								>
									<Text className="text-white font-semibold">Add Preset</Text>
								</TouchableOpacity>
							</View>
						)}

						<View className="gap-2">
							{presets.map(preset => (
								<View
									key={preset.id}
									className="bg-card dark:bg-card-dark border border-border dark:border-border-dark rounded-xl px-4 py-3 flex-row items-center justify-between"
								>
									<View className="flex-1 mr-2">
										<Text className="text-text dark:text-text-dark text-sm font-medium">
											{preset.label}
										</Text>
										<Text
											className="text-muted dark:text-muted-dark text-xs mt-0.5"
											numberOfLines={1}
										>
											{preset.text}
										</Text>
									</View>
									<TouchableOpacity
										className="p-1"
										onPress={() => removePreset(preset.id)}
									>
										<Ionicons
											name="close-circle-outline"
											size={20}
											color={mutedColor}
										/>
									</TouchableOpacity>
								</View>
							))}
						</View>
					</View>

					{/* GitHub Sign In */}
					{!isAuthed && (
						<View className="gap-3">
							<Text className="text-xs font-bold text-muted dark:text-muted-dark uppercase tracking-widest">
								Quick Sign In
							</Text>
							<TouchableOpacity
								className={`flex-row items-center justify-center gap-3 rounded-xl py-3 border border-border dark:border-border-dark bg-card dark:bg-card-dark ${githubLoading ? 'opacity-60' : ''}`}
								onPress={handleGithubSignIn}
								disabled={githubLoading}
							>
								<Ionicons
									name="logo-github"
									size={20}
									color={iconColor}
								/>
								<Text className="text-text dark:text-text-dark font-semibold">
									{githubLoading ? 'Opening browser...' : 'Sign in with GitHub'}
								</Text>
							</TouchableOpacity>
							<Text className="text-muted dark:text-muted-dark text-xs text-center">
								Opens a browser window for GitHub OAuth
							</Text>
						</View>
					)}

					{/* Credentials */}
					<View className="gap-3">
						<View className="flex-row items-center justify-between">
							<Text className="text-xs font-bold text-muted dark:text-muted-dark uppercase tracking-widest">
								Credentials
							</Text>
							<TouchableOpacity
								onPress={() =>
									setLoginMode(m => (m === 'token' ? 'password' : 'token'))
								}
							>
								<Text className="text-primary text-xs font-medium">
									{loginMode === 'token' ? 'Use Email+Password' : 'Use Token'}
								</Text>
							</TouchableOpacity>
						</View>

						{loginMode === 'password' ? (
							<>
								<View>
									<Text className="text-muted dark:text-muted-dark text-xs mb-1">
										Email
									</Text>
									<TextInput
										className="bg-card dark:bg-card-dark border border-border dark:border-border-dark rounded-xl px-4 py-3 text-text dark:text-text-dark text-sm"
										placeholder="you@example.com"
										placeholderTextColor={placeholderColor}
										value={emailInput}
										onChangeText={setEmailInput}
										autoCapitalize="none"
										autoCorrect={false}
										keyboardType="email-address"
									/>
								</View>
								<View>
									<Text className="text-muted dark:text-muted-dark text-xs mb-1">
										Password
									</Text>
									<View className="flex-row items-center bg-card dark:bg-card-dark border border-border dark:border-border-dark rounded-xl">
										<TextInput
											className="flex-1 px-4 py-3 text-text dark:text-text-dark text-sm"
											placeholder="Your password"
											placeholderTextColor={placeholderColor}
											value={passwordInput}
											onChangeText={setPasswordInput}
											secureTextEntry={!tokenVisible}
											autoCapitalize="none"
											autoCorrect={false}
										/>
										<TouchableOpacity
											className="pr-4"
											onPress={() => setTokenVisible(v => !v)}
										>
											<Ionicons
												name={tokenVisible ? 'eye-off-outline' : 'eye-outline'}
												size={18}
												color={mutedColor}
											/>
										</TouchableOpacity>
									</View>
								</View>
								<TouchableOpacity
									className={`rounded-xl py-3 items-center ${loginLoading ? 'bg-border dark:bg-border-dark' : 'bg-primary'}`}
									onPress={handlePasswordLogin}
									disabled={loginLoading}
								>
									<Text className="text-white font-semibold">
										{loginLoading ? 'Signing in...' : 'Sign In'}
									</Text>
								</TouchableOpacity>
							</>
						) : (
							<>
								<View>
									<Text className="text-muted dark:text-muted-dark text-xs mb-1">
										User ID
									</Text>
									<TextInput
										className="bg-card dark:bg-card-dark border border-border dark:border-border-dark rounded-xl px-4 py-3 text-text dark:text-text-dark text-sm"
										placeholder={userId ?? 'your-user-id'}
										placeholderTextColor={placeholderColor}
										value={userIdInput}
										onChangeText={setUserIdInput}
										autoCapitalize="none"
										autoCorrect={false}
									/>
								</View>

								<View>
									<Text className="text-muted dark:text-muted-dark text-xs mb-1">
										API Token
									</Text>
									<View className="flex-row items-center bg-card dark:bg-card-dark border border-border dark:border-border-dark rounded-xl">
										<TextInput
											className="flex-1 px-4 py-3 text-text dark:text-text-dark text-sm"
											placeholder="sk-..."
											placeholderTextColor={placeholderColor}
											value={tokenInput}
											onChangeText={setTokenInput}
											secureTextEntry={!tokenVisible}
											autoCapitalize="none"
											autoCorrect={false}
										/>
										<TouchableOpacity
											className="pr-4"
											onPress={() => setTokenVisible(v => !v)}
										>
											<Ionicons
												name={tokenVisible ? 'eye-off-outline' : 'eye-outline'}
												size={18}
												color={mutedColor}
											/>
										</TouchableOpacity>
									</View>
								</View>

								<TouchableOpacity
									className={`rounded-xl py-3 items-center ${saving ? 'bg-border dark:bg-border-dark' : 'bg-primary'}`}
									onPress={handleSave}
									disabled={saving}
								>
									<Text className="text-white font-semibold">
										{saving ? 'Saving...' : 'Save Credentials'}
									</Text>
								</TouchableOpacity>
							</>
						)}
					</View>

					{/* Server URL */}
					<View className="gap-3">
						<Text className="text-xs font-bold text-muted dark:text-muted-dark uppercase tracking-widest">
							Server
						</Text>
						<View>
							<Text className="text-muted dark:text-muted-dark text-xs mb-1">
								Server URL
							</Text>
							<TextInput
								className="bg-card dark:bg-card-dark border border-border dark:border-border-dark rounded-xl px-4 py-3 text-text dark:text-text-dark text-sm"
								placeholder={DEFAULT_URL}
								placeholderTextColor={placeholderColor}
								value={urlInput}
								onChangeText={setUrlInput}
								autoCapitalize="none"
								autoCorrect={false}
								keyboardType="url"
							/>
						</View>
						<TouchableOpacity
							className="bg-card dark:bg-card-dark border border-border dark:border-border-dark rounded-xl py-3 items-center"
							onPress={handleUpdateUrl}
						>
							<Text className="text-primary font-semibold">Update URL</Text>
						</TouchableOpacity>
					</View>

					{/* Workspaces */}
					<View className="gap-3">
						<View className="flex-row items-center justify-between">
							<Text className="text-xs font-bold text-muted dark:text-muted-dark uppercase tracking-widest">
								Workspaces
							</Text>
							<TouchableOpacity onPress={() => setShowAddWorkspace(v => !v)}>
								<Text className="text-primary text-sm font-medium">
									{showAddWorkspace ? 'Cancel' : '+ Add'}
								</Text>
							</TouchableOpacity>
						</View>

						{showAddWorkspace && (
							<View className="bg-card dark:bg-card-dark border border-border dark:border-border-dark rounded-xl p-4 gap-3">
								<TextInput
									className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl px-4 py-3 text-text dark:text-text-dark text-sm"
									placeholder="Workspace name"
									placeholderTextColor={placeholderColor}
									value={newWsName}
									onChangeText={setNewWsName}
								/>
								<TextInput
									className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl px-4 py-3 text-text dark:text-text-dark text-sm"
									placeholder="Directory path (e.g., /path/to/project)"
									placeholderTextColor={placeholderColor}
									value={newWsPath}
									onChangeText={setNewWsPath}
								/>
								<View className="flex-row gap-2">
									<View className="flex-1">
										<Text className="text-muted dark:text-muted-dark text-xs mb-1">
											Provider
										</Text>
										<TextInput
											className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl px-4 py-3 text-text dark:text-text-dark text-sm"
											placeholder="openai, anthropic…"
											placeholderTextColor={placeholderColor}
											value={newWsProvider}
											onChangeText={setNewWsProvider}
										/>
									</View>
									<View className="flex-1">
										<Text className="text-muted dark:text-muted-dark text-xs mb-1">
											Model
										</Text>
										<TextInput
											className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl px-4 py-3 text-text dark:text-text-dark text-sm"
											placeholder="Optional"
											placeholderTextColor={placeholderColor}
											value={newWsModel}
											onChangeText={setNewWsModel}
										/>
									</View>
								</View>
								<TouchableOpacity
									className="bg-primary rounded-xl py-3 items-center"
									onPress={handleAddWorkspace}
								>
									<Text className="text-white font-semibold">
										Add Workspace
									</Text>
								</TouchableOpacity>
							</View>
						)}

						{workspaces.length === 0 ? (
							<Text className="text-muted dark:text-muted-dark text-sm">
								No workspaces configured.
							</Text>
						) : (
							<View className="gap-2">
								{workspaces.map(ws => (
									<View
										key={ws.id}
										className={`bg-card dark:bg-card-dark border rounded-xl p-4 flex-row items-center justify-between ${
											ws.id === activeWorkspaceId || ws.isActive
												? 'border-primary'
												: 'border-border dark:border-border-dark'
										}`}
									>
										<View className="flex-1">
											<View className="flex-row items-center gap-2">
												<Text className="text-text dark:text-text-dark font-medium">
													{ws.name}
												</Text>
												{(ws.id === activeWorkspaceId || ws.isActive) && (
													<Ionicons
														name="checkmark-circle"
														size={14}
														color="#7c3aed"
													/>
												)}
											</View>
											<Text className="text-muted dark:text-muted-dark text-xs font-mono">
												{ws.path}
											</Text>
											<View className="flex-row gap-1 mt-1">
												{ws.defaultProvider && (
													<View className="bg-surface dark:bg-surface-dark px-2 py-0.5 rounded">
														<Text className="text-muted dark:text-muted-dark text-xs">
															{ws.defaultProvider}
														</Text>
													</View>
												)}
												{ws.defaultModel && (
													<View className="bg-surface dark:bg-surface-dark px-2 py-0.5 rounded">
														<Text className="text-muted dark:text-muted-dark text-xs">
															{ws.defaultModel}
														</Text>
													</View>
												)}
											</View>
										</View>
										<View className="flex-row gap-1">
											<TouchableOpacity
												className="p-2"
												onPress={() =>
													setActiveWorkspace(
														ws.id === activeWorkspaceId || ws.isActive
															? null
															: ws.id,
													)
												}
											>
												<Ionicons
													name={
														ws.id === activeWorkspaceId || ws.isActive
															? 'checkmark-circle'
															: 'checkmark-circle-outline'
													}
													size={20}
													color={
														ws.id === activeWorkspaceId || ws.isActive
															? '#3b82f6'
															: mutedColor
													}
												/>
											</TouchableOpacity>
											<TouchableOpacity
												className="p-2"
												onPress={() => handleRemoveWorkspace(ws.id, ws.name)}
											>
												<Ionicons
													name="trash-outline"
													size={20}
													color="#ef4444"
												/>
											</TouchableOpacity>
										</View>
									</View>
								))}
							</View>
						)}
					</View>

					{/* Bottom spacing */}
					<View className="h-8" />
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	)
}
