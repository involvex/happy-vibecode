import {
	FlatList,
	KeyboardAvoidingView,
	Platform,
	RefreshControl,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native'
import {useCallback, useEffect, useRef, useState} from 'react'
import {SafeAreaView} from 'react-native-safe-area-context'
import {useAuth} from '../../hooks/useAuth'
import {useRouter} from 'expo-router'

interface Message {
	id: string
	role: 'user' | 'assistant' | 'system'
	content: string
	done?: boolean
}

export default function ChatTab() {
	const {isAuthed, userId, apiToken, serverUrl} = useAuth()
	const router = useRouter()
	const [messages, setMessages] = useState<Message[]>([])
	const [input, setInput] = useState('')
	const [cliConnected, setCliConnected] = useState(false)
	const [refreshing, setRefreshing] = useState(false)
	const wsRef = useRef<WebSocket | null>(null)
	const flatListRef = useRef<FlatList>(null)
	const userIdRef = useRef(userId)
	const serverUrlRef = useRef(serverUrl)
	const apiTokenRef = useRef(apiToken)

	userIdRef.current = userId
	serverUrlRef.current = serverUrl
	apiTokenRef.current = apiToken

	const onRefresh = useCallback(() => {
		setRefreshing(true)
		wsRef.current?.close()
		setCliConnected(false)

		// Reconnect immediately
		const uid = userIdRef.current
		if (!uid) {
			setTimeout(() => setRefreshing(false), 500)
			return
		}
		const host = (
			serverUrlRef.current ?? 'https://happy-vibecode.involvex.workers.dev'
		).replace('http', 'ws')
		const tokenParam = apiTokenRef.current
			? `&token=${encodeURIComponent(apiTokenRef.current)}`
			: ''
		const ws = new WebSocket(
			`${host}/agents/BridgeAgent/${uid}?type=mobile${tokenParam}`,
		)
		wsRef.current = ws
		ws.onopen = () => {
			ws.send(JSON.stringify({type: 'ping'}))
			setRefreshing(false)
		}
		ws.onmessage = event => {
			try {
				const msg = JSON.parse(event.data as string) as {
					type: string
					status?: string
				}
				if (msg.type === 'status') {
					setCliConnected(
						msg.status === 'cli_connected' || msg.status === 'cli_already_here',
					)
					if (msg.status === 'cli_disconnected') setCliConnected(false)
				}
			} catch {}
		}
		ws.onclose = () => setCliConnected(false)
		setTimeout(() => setRefreshing(false), 2000)
	}, [])

	useEffect(() => {
		if (!isAuthed || !userId) return

		const host = (
			serverUrl ?? 'https://happy-vibecode.involvex.workers.dev'
		).replace('http', 'ws')
		const tokenParam = apiToken ? `&token=${encodeURIComponent(apiToken)}` : ''
		const ws = new WebSocket(
			`${host}/agents/BridgeAgent/${userId}?type=mobile${tokenParam}`,
		)
		wsRef.current = ws

		ws.onopen = () => {
			ws.send(JSON.stringify({type: 'ping'}))
		}

		ws.onmessage = event => {
			try {
				const msg = JSON.parse(event.data as string) as {
					type: string
					content?: string
					done?: boolean
					status?: string
					message?: string
					sessionId?: string
				}

				if (msg.type === 'status') {
					setCliConnected(
						msg.status === 'cli_connected' || msg.status === 'cli_already_here',
					)
					if (msg.status === 'cli_disconnected') setCliConnected(false)
					return
				}

				if (msg.type === 'response' && msg.content !== undefined) {
					setMessages(prev => {
						const last = prev[prev.length - 1]
						if (last?.role === 'assistant' && !last.done) {
							return [
								...prev.slice(0, -1),
								{...last, content: last.content + msg.content, done: msg.done},
							]
						}
						return [
							...prev,
							{
								id: Date.now().toString(),
								role: 'assistant',
								content: msg.content ?? '',
								done: msg.done,
							},
						]
					})
				}

				if (msg.type === 'error') {
					setMessages(prev => [
						...prev,
						{
							id: Date.now().toString(),
							role: 'system',
							content: msg.message ?? 'Unknown error',
						},
					])
				}
			} catch {
				// ignore parse errors
			}
		}

		ws.onclose = () => {
			setCliConnected(false)
		}

		return () => {
			ws.close()
		}
	}, [isAuthed, userId, apiToken, serverUrl])

	if (!isAuthed) {
		return (
			<SafeAreaView className="flex-1 bg-surface items-center justify-center">
				<Text className="text-text text-lg mb-4">
					Sign in to start chatting
				</Text>
				<TouchableOpacity
					className="bg-primary px-6 py-3 rounded-xl"
					onPress={() => router.push('/(tabs)/settings')}
				>
					<Text className="text-white font-semibold">Go to Settings</Text>
				</TouchableOpacity>
			</SafeAreaView>
		)
	}

	const sendMessage = () => {
		const content = input.trim()
		if (!content || !wsRef.current) return
		const ws = wsRef.current
		if (ws.readyState !== WebSocket.OPEN) return

		const msg = {
			type: 'prompt' as const,
			content,
			sessionId: userId ?? 'default',
		}
		ws.send(JSON.stringify(msg))

		setMessages(prev => [
			...prev,
			{id: Date.now().toString(), role: 'user', content},
		])
		setInput('')

		setTimeout(() => flatListRef.current?.scrollToEnd({animated: true}), 100)
	}

	return (
		<SafeAreaView className="flex-1 bg-surface">
			{/* Header */}
			<View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
				<Text className="text-text text-lg font-semibold">Chat</Text>
				<View className="flex-row items-center gap-2">
					<View
						className={`w-2 h-2 rounded-full ${cliConnected ? 'bg-success' : 'bg-muted'}`}
					/>
					<Text className="text-muted text-xs">
						{cliConnected ? 'Agent connected' : 'No agent'}
					</Text>
				</View>
			</View>

			<KeyboardAvoidingView
				className="flex-1"
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			>
				{/* Messages */}
				<FlatList
					ref={flatListRef}
					data={messages}
					keyExtractor={item => item.id}
					className="flex-1 px-4"
					contentContainerStyle={{paddingVertical: 12, gap: 8}}
					refreshControl={
						<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
					}
					renderItem={({item}) => (
						<View
							className={`max-w-[80%] rounded-2xl px-4 py-3 ${
								item.role === 'user'
									? 'self-end bg-primary'
									: item.role === 'system'
										? 'self-center bg-border'
										: 'self-start bg-card border border-border'
							}`}
						>
							<Text
								className={item.role === 'user' ? 'text-white' : 'text-text'}
							>
								{item.content}
							</Text>
						</View>
					)}
					ListEmptyComponent={
						<View className="flex-1 items-center justify-center py-12">
							<Text className="text-muted text-center">
								{cliConnected
									? 'Start the conversation…'
									: 'Connect a local agent via the CLI to start chatting'}
							</Text>
						</View>
					}
				/>

				{/* Input */}
				<View className="flex-row items-end gap-2 px-4 py-3 border-t border-border">
					<TextInput
						className="flex-1 bg-card border border-border rounded-2xl px-4 py-3 text-text text-sm"
						placeholder="Type a message…"
						placeholderTextColor="#94a3b8"
						value={input}
						onChangeText={setInput}
						multiline
						maxLength={4000}
						onSubmitEditing={sendMessage}
						blurOnSubmit={false}
					/>
					<TouchableOpacity
						className={`w-10 h-10 rounded-full items-center justify-center ${
							input.trim() ? 'bg-primary' : 'bg-border'
						}`}
						onPress={sendMessage}
						disabled={!input.trim()}
					>
						<Text className="text-white text-lg">↑</Text>
					</TouchableOpacity>
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	)
}
