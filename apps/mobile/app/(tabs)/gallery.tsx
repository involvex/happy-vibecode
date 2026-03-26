import {
	ActivityIndicator,
	FlatList,
	Text,
	TouchableOpacity,
	View,
} from 'react-native'
import {SafeAreaView} from 'react-native-safe-area-context'
import {useAuth} from '../../hooks/useAuth'
import {Ionicons} from '@expo/vector-icons'
import {useEffect, useState} from 'react'
import {useRouter} from 'expo-router'

interface Session {
	id: string
	agentType: string
	status: 'active' | 'inactive' | 'error'
	createdAt: string
	updatedAt: string
}

function formatRelative(dateStr: string) {
	const diff = Date.now() - new Date(dateStr).getTime()
	const mins = Math.floor(diff / 60_000)
	if (mins < 1) return 'just now'
	if (mins < 60) return `${mins}m ago`
	const hrs = Math.floor(mins / 60)
	if (hrs < 24) return `${hrs}h ago`
	return `${Math.floor(hrs / 24)}d ago`
}

export default function GalleryScreen() {
	const {isAuthed, apiToken, serverUrl} = useAuth()
	const router = useRouter()
	const [sessions, setSessions] = useState<Session[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (!isAuthed || !apiToken) {
			setLoading(false)
			return
		}
		const base = serverUrl ?? 'https://happy-vibecode.involvex.workers.dev'
		fetch(`${base}/api/sessions`, {
			headers: {Authorization: `Bearer ${apiToken}`},
		})
			.then(r =>
				r.ok ? (r.json() as Promise<{sessions: Session[]}>) : Promise.reject(r),
			)
			.then(data => setSessions(data.sessions ?? []))
			.catch(() => setError('Failed to load sessions'))
			.finally(() => setLoading(false))
	}, [isAuthed, apiToken, serverUrl])

	if (!isAuthed) {
		return (
			<SafeAreaView className="flex-1 bg-surface items-center justify-center">
				<Text className="text-muted text-center px-6">
					Sign in via Settings to view your agent sessions
				</Text>
			</SafeAreaView>
		)
	}

	return (
		<SafeAreaView className="flex-1 bg-surface">
			<View className="px-4 py-3 border-b border-border">
				<Text className="text-text text-lg font-semibold">Agent Gallery</Text>
				<Text className="text-muted text-xs mt-0.5">Your active sessions</Text>
			</View>

			{loading ? (
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator color="#7c3aed" />
				</View>
			) : error ? (
				<View className="flex-1 items-center justify-center px-6">
					<Text className="text-error text-center">{error}</Text>
				</View>
			) : sessions.length === 0 ? (
				<View className="flex-1 items-center justify-center px-6 gap-3">
					<Ionicons name="sparkles-outline" size={40} color="#94a3b8" />
					<Text className="text-muted text-center">
						No sessions yet.{'\n'}Connect a local agent via the CLI to get
						started.
					</Text>
				</View>
			) : (
				<FlatList
					data={sessions}
					keyExtractor={item => item.id}
					contentContainerStyle={{padding: 16, gap: 12}}
					renderItem={({item}) => (
						<TouchableOpacity
							className="bg-card border border-border rounded-2xl p-4"
							onPress={() => router.push(`/session/${item.id}`)}
						>
							<View className="flex-row items-start justify-between mb-2">
								<Text
									className="text-text font-semibold flex-1 mr-2"
									numberOfLines={1}
								>
									{item.agentType ?? 'Unknown agent'}
								</Text>
								<View
									className={`rounded-full px-2 py-0.5 ${
										item.status === 'active' ? 'bg-success/20' : 'bg-border'
									}`}
								>
									<Text
										className={`text-xs font-medium ${
											item.status === 'active' ? 'text-success' : 'text-muted'
										}`}
									>
										{item.status}
									</Text>
								</View>
							</View>
							<View className="flex-row items-center justify-between">
								<View className="flex-row items-center gap-1">
									<Ionicons name="time-outline" size={12} color="#94a3b8" />
									<Text className="text-muted text-xs">
										{formatRelative(item.updatedAt ?? item.createdAt)}
									</Text>
								</View>
								<Ionicons name="arrow-forward" size={16} color="#7c3aed" />
							</View>
						</TouchableOpacity>
					)}
				/>
			)}
		</SafeAreaView>
	)
}
