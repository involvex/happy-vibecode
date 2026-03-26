import {
	Alert,
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native'
import {SafeAreaView} from 'react-native-safe-area-context'
import {useAuth} from '../../hooks/useAuth'
import {Ionicons} from '@expo/vector-icons'
import {useState} from 'react'

const DEFAULT_URL = 'https://happy-vibecode.workers.dev'

export default function SettingsScreen() {
	const {isAuthed, apiToken, userId, serverUrl, login, logout, setServerUrl} =
		useAuth()

	const [tokenInput, setTokenInput] = useState('')
	const [userIdInput, setUserIdInput] = useState('')
	const [urlInput, setUrlInput] = useState(serverUrl ?? DEFAULT_URL)
	const [tokenVisible, setTokenVisible] = useState(false)
	const [saving, setSaving] = useState(false)

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
