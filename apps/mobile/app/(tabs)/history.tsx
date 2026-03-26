import {
	ActivityIndicator,
	FlatList,
	Text,
	TextInput,
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
	status: string
	createdAt: string
}

function formatDate(dateStr: string) {
	return new Date(dateStr).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

export default function HistoryScreen() {
	const {isAuthed, apiToken, serverUrl} = useAuth()
	const router = useRouter()
	const [sessions, setSessions] = useState<Session[]>([])
	const [filtered, setFiltered] = useState<Session[]>([])
	const [loading, setLoading] = useState(true)
	const [query, setQuery] = useState('')

	useEffect(() => {
		if (!isAuthed || !apiToken) {
			setLoading(false)
			return
		}
		const base = serverUrl ?? 'https://happy-vibecode.workers.dev'
		fetch(`${base}/api/sessions?status=closed`, {
			headers: {Authorization: `Bearer ${apiToken}`},
		})
			.then(r =>
				r.ok ? (r.json() as Promise<{sessions: Session[]}>) : Promise.reject(r),
			)
			.then(data => {
				const list = data.sessions ?? []
				setSessions(list)
				setFiltered(list)
			})
			.catch(() => {})
			.finally(() => setLoading(false))
	}, [isAuthed, apiToken, serverUrl])

	useEffect(() => {
		const q = query.toLowerCase()
		setFiltered(
			q
				? sessions.filter(
						s => s.agentType?.toLowerCase().includes(q) || s.id.includes(q),
					)
				: sessions,
		)
	}, [query, sessions])

	if (!isAuthed) {
		return (
			<SafeAreaView className="flex-1 bg-surface items-center justify-center">
				<Text className="text-muted text-center px-6">
					Sign in via Settings to view your history
				</Text>
			</SafeAreaView>
		)
	}

	return (
		<SafeAreaView className="flex-1 bg-surface">
			<View className="px-4 py-3 border-b border-border">
				<Text className="text-text text-lg font-semibold">History</Text>
			</View>

			<View className="px-4 pt-3 pb-2">
				<View className="flex-row items-center bg-card border border-border rounded-xl px-3 gap-2">
					<Ionicons name="search-outline" size={16} color="#94a3b8" />
					<TextInput
						className="flex-1 py-2.5 text-text text-sm"
						placeholder="Search sessions…"
						placeholderTextColor="#94a3b8"
						value={query}
						onChangeText={setQuery}
					/>
				</View>
			</View>

			{loading ? (
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator color="#7c3aed" />
				</View>
			) : filtered.length === 0 ? (
				<View className="flex-1 items-center justify-center px-6 gap-3">
					<Ionicons name="time-outline" size={40} color="#94a3b8" />
					<Text className="text-muted text-center">
						{query ? 'No sessions match your search' : 'No past sessions yet'}
					</Text>
				</View>
			) : (
				<FlatList
					data={filtered}
					keyExtractor={item => item.id}
					contentContainerStyle={{
						paddingHorizontal: 16,
						paddingBottom: 16,
						gap: 8,
					}}
					renderItem={({item}) => (
						<TouchableOpacity
							className="bg-card border border-border rounded-xl p-3 flex-row items-center justify-between"
							onPress={() => router.push(`/session/${item.id}`)}
						>
							<View className="flex-1 mr-3">
								<Text className="text-text font-medium" numberOfLines={1}>
									{item.agentType ?? 'Session'}
								</Text>
								<Text className="text-muted text-xs mt-0.5">
									{formatDate(item.createdAt)}
								</Text>
							</View>
							<Ionicons name="chevron-forward" size={16} color="#94a3b8" />
						</TouchableOpacity>
					)}
				/>
			)}
		</SafeAreaView>
	)
}
