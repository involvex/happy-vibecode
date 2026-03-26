import {
	Alert,
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native'
import {SafeAreaView} from 'react-native-safe-area-context'
import {useWorkspaces} from '../../hooks/useWorkspaces'
import {useAuth} from '../../hooks/useAuth'
import {Ionicons} from '@expo/vector-icons'
import {useState} from 'react'

const DEFAULT_URL = 'https://happy-vibecode.involvex.workers.dev'

const PROVIDERS = [
	{label: 'Gemini CLI', value: 'gemini'},
	{label: 'Claude Code', value: 'claude'},
	{label: 'OpenAI Codex', value: 'codex'},
	{label: 'OpenCode AI', value: 'opencode-ai'},
	{label: 'GitHub Copilot', value: 'copilot'},
]

export default function SettingsScreen() {
	const {isAuthed, userId, serverUrl, login, logout, setServerUrl} = useAuth()
	const {
		workspaces,
		activeWorkspaceId,
		addWorkspace,
		removeWorkspace,
		setActiveWorkspace,
	} = useWorkspaces()

	const [tokenInput, setTokenInput] = useState('')
	const [userIdInput, setUserIdInput] = useState('')
	const [urlInput, setUrlInput] = useState(serverUrl ?? DEFAULT_URL)
	const [tokenVisible, setTokenVisible] = useState(false)
	const [saving, setSaving] = useState(false)

	const [showAddWorkspace, setShowAddWorkspace] = useState(false)
	const [newWsName, setNewWsName] = useState('')
	const [newWsPath, setNewWsPath] = useState('')
	const [newWsProvider, setNewWsProvider] = useState('')
	const [newWsModel, setNewWsModel] = useState('')

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

	return (
		<SafeAreaView className="flex-1 bg-surface">
			<View className="px-4 py-3 border-b border-border">
				<Text className="text-text text-lg font-semibold">Settings</Text>
			</View>

			<ScrollView
				className="flex-1"
				contentContainerStyle={{padding: 16, gap: 16}}
			>
				{/* Status card */}
				<View className="bg-card border border-border rounded-2xl p-4">
					<View className="flex-row items-center gap-2 mb-2">
						<View
							className={`w-2.5 h-2.5 rounded-full ${isAuthed ? 'bg-success' : 'bg-error'}`}
						/>
						<Text className="text-text font-semibold">
							{isAuthed ? 'Signed in' : 'Not signed in'}
						</Text>
					</View>
					{isAuthed && (
						<>
							<Text className="text-muted text-xs">User ID: {userId}</Text>
							<Text className="text-muted text-xs mt-0.5">
								Token: {'•'.repeat(12)}
							</Text>
						</>
					)}
				</View>

				{/* Credentials */}
				<View className="gap-3">
					<Text className="text-text font-semibold text-sm uppercase tracking-wide">
						Credentials
					</Text>

					<View>
						<Text className="text-muted text-xs mb-1">User ID</Text>
						<TextInput
							className="bg-card border border-border rounded-xl px-4 py-3 text-text text-sm"
							placeholder={userId ?? 'your-user-id'}
							placeholderTextColor="#64748b"
							value={userIdInput}
							onChangeText={setUserIdInput}
							autoCapitalize="none"
							autoCorrect={false}
						/>
					</View>

					<View>
						<Text className="text-muted text-xs mb-1">API Token</Text>
						<View className="flex-row items-center bg-card border border-border rounded-xl">
							<TextInput
								className="flex-1 px-4 py-3 text-text text-sm"
								placeholder="sk-…"
								placeholderTextColor="#64748b"
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
									color="#94a3b8"
								/>
							</TouchableOpacity>
						</View>
					</View>

					<TouchableOpacity
						className={`rounded-xl py-3 items-center ${saving ? 'bg-border' : 'bg-primary'}`}
						onPress={handleSave}
						disabled={saving}
					>
						<Text className="text-white font-semibold">
							{saving ? 'Saving…' : 'Save Credentials'}
						</Text>
					</TouchableOpacity>
				</View>

				{/* Server URL */}
				<View className="gap-3">
					<Text className="text-text font-semibold text-sm uppercase tracking-wide">
						Server
					</Text>
					<View>
						<Text className="text-muted text-xs mb-1">Server URL</Text>
						<TextInput
							className="bg-card border border-border rounded-xl px-4 py-3 text-text text-sm"
							placeholder={DEFAULT_URL}
							placeholderTextColor="#64748b"
							value={urlInput}
							onChangeText={setUrlInput}
							autoCapitalize="none"
							autoCorrect={false}
							keyboardType="url"
						/>
					</View>
					<TouchableOpacity
						className="bg-card border border-border rounded-xl py-3 items-center"
						onPress={handleUpdateUrl}
					>
						<Text className="text-primary font-semibold">Update URL</Text>
					</TouchableOpacity>
				</View>

				{/* Workspaces */}
				<View className="gap-3">
					<View className="flex-row items-center justify-between">
						<Text className="text-text font-semibold text-sm uppercase tracking-wide">
							Workspaces
						</Text>
						<TouchableOpacity onPress={() => setShowAddWorkspace(v => !v)}>
							<Text className="text-primary text-sm font-medium">
								{showAddWorkspace ? 'Cancel' : '+ Add'}
							</Text>
						</TouchableOpacity>
					</View>

					{showAddWorkspace && (
						<View className="bg-card border border-border rounded-xl p-4 gap-3">
							<TextInput
								className="bg-surface border border-border rounded-xl px-4 py-3 text-text text-sm"
								placeholder="Workspace name"
								placeholderTextColor="#64748b"
								value={newWsName}
								onChangeText={setNewWsName}
							/>
							<TextInput
								className="bg-surface border border-border rounded-xl px-4 py-3 text-text text-sm"
								placeholder="Directory path (e.g., /path/to/project)"
								placeholderTextColor="#64748b"
								value={newWsPath}
								onChangeText={setNewWsPath}
							/>
							<View className="flex-row gap-2">
								<View className="flex-1">
									<Text className="text-muted text-xs mb-1">Provider</Text>
									<View className="bg-surface border border-border rounded-xl">
										{/* Native picker would be better but TextInput for simplicity */}
										<TextInput
											className="px-4 py-3 text-text text-sm"
											placeholder="Select..."
											placeholderTextColor="#64748b"
											value={newWsProvider}
											onChangeText={setNewWsProvider}
										/>
									</View>
								</View>
								<View className="flex-1">
									<Text className="text-muted text-xs mb-1">Model</Text>
									<TextInput
										className="bg-surface border border-border rounded-xl px-4 py-3 text-text text-sm"
										placeholder="Optional"
										placeholderTextColor="#64748b"
										value={newWsModel}
										onChangeText={setNewWsModel}
									/>
								</View>
							</View>
							<TouchableOpacity
								className="bg-primary rounded-xl py-3 items-center"
								onPress={handleAddWorkspace}
							>
								<Text className="text-white font-semibold">Add Workspace</Text>
							</TouchableOpacity>
						</View>
					)}

					{workspaces.length === 0 ? (
						<Text className="text-muted text-sm">
							No workspaces configured.
						</Text>
					) : (
						<View className="gap-2">
							{workspaces.map(ws => (
								<View
									key={ws.id}
									className={`bg-card border rounded-xl p-4 flex-row items-center justify-between ${
										ws.id === activeWorkspaceId || ws.isActive
											? 'border-primary'
											: 'border-border'
									}`}
								>
									<View className="flex-1">
										<View className="flex-row items-center gap-2">
											<Text className="text-text font-medium">{ws.name}</Text>
											{(ws.id === activeWorkspaceId || ws.isActive) && (
												<Ionicons
													name="checkmark-circle"
													size={14}
													color="#3b82f6"
												/>
											)}
										</View>
										<Text className="text-muted text-xs font-mono">
											{ws.path}
										</Text>
										<View className="flex-row gap-1 mt-1">
											{ws.defaultProvider && (
												<View className="bg-surface px-2 py-0.5 rounded">
													<Text className="text-muted text-xs">
														{ws.defaultProvider}
													</Text>
												</View>
											)}
											{ws.defaultModel && (
												<View className="bg-surface px-2 py-0.5 rounded">
													<Text className="text-muted text-xs">
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
														: '#94a3b8'
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

					<Text className="text-muted text-xs">
						Workspaces are stored locally on this device.
					</Text>
				</View>

				{/* Sign out */}
				{isAuthed && (
					<TouchableOpacity
						className="border border-error rounded-xl py-3 items-center mt-2"
						onPress={handleLogout}
					>
						<Text className="text-error font-semibold">Sign Out</Text>
					</TouchableOpacity>
				)}

				<Text className="text-muted text-xs text-center mt-2">
					Happy Vibecode — Remote Agent Control
				</Text>
			</ScrollView>
		</SafeAreaView>
	)
}
