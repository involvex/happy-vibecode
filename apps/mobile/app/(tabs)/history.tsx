import {
	ActivityIndicator,
	FlatList,
	RefreshControl,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native'
import {SafeAreaView} from 'react-native-safe-area-context'
import {useCallback, useEffect, useState} from 'react'
import {useAuth} from '../../hooks/useAuth'
import {Ionicons} from '@expo/vector-icons'
import {useRouter} from 'expo-router'

interface Session {
	id: string
	agentType: string
	connectionStatus: string
	startedAt: number | string
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
	const [refreshing, setRefreshing] = useState(false)

	const fetchSessions = useCallback(async () => {
		if (!isAuthed || !apiToken) return
		const base = serverUrl ?? 'https://happy-vibecode.involvex.workers.dev'
		try {
			const r = await fetch(`${base}/api/sessions?status=disconnected`, {
				headers: {Authorization: `Bearer ${apiToken}`},
			})
			if (r.ok) {
				const data = (await r.json()) as {sessions: Session[]}
				const list = data.sessions ?? []
				setSessions(list)
				setFiltered(list)
			}
		} catch {}
	}, [isAuthed, apiToken, serverUrl])

	useEffect(() => {
		if (!isAuthed || !apiToken) {
			setLoading(false)
			return
		}
		setLoading(true)
		fetchSessions().finally(() => setLoading(false))
	}, [isAuthed, apiToken, fetchSessions])

	const onRefresh = useCallback(async () => {
		setRefreshing(true)
		await fetchSessions()
		setRefreshing(false)
	}, [fetchSessions])

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
			<SafeAreaView className="flex-1 items-center justify-center bg-surface dark:bg-surface-dark">
				<Text className="text-sm text-muted dark:text-muted-dark text-center px-6">
					Sign in via Settings to view your history
				</Text>
			</SafeAreaView>
		)
	}

	return (
		<SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark">
			<View className="px-4 py-3 border-b border-border dark:border-border-dark">
				<Text className="text-xl font-bold text-text dark:text-text-dark">
					History
				</Text>
				<Text className="text-sm text-muted dark:text-muted-dark mt-0.5">
					Past sessions
				</Text>
			</View>

			<View className="px-4 pt-3 pb-2">
				<View className="flex-row items-center bg-card dark:bg-card-dark border border-border dark:border-border-dark rounded-xl px-3 gap-2">
					<Ionicons name="search-outline" size={16} color="#94a3b8" />
					<TextInput
						className="flex-1 py-2.5 text-text dark:text-text-dark text-sm"
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
					<Text className="text-sm text-muted dark:text-muted-dark text-center">
						{query ? 'No sessions match your search' : 'No past sessions yet'}
					</Text>
				</View>
			) : (
				<FlatList
					data={filtered}
					keyExtractor={item => item.id}
					refreshControl={
						<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
					}
					contentContainerStyle={{
						paddingHorizontal: 16,
						paddingBottom: 16,
						gap: 8,
					}}
					renderItem={({item}) => (
						<TouchableOpacity
							className="bg-card dark:bg-card-dark border border-border dark:border-border-dark rounded-xl p-3 flex-row items-center justify-between"
							onPress={() => router.push(`/session/${item.id}`)}
						>
							<View className="flex-1 mr-3">
								<Text
									className="text-text dark:text-text-dark font-medium"
									numberOfLines={1}
								>
									{item.agentType ?? 'Session'}
								</Text>
								<Text className="text-muted dark:text-muted-dark text-xs mt-0.5">
									{item.startedAt ? formatDate(String(item.startedAt)) : '—'}
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
