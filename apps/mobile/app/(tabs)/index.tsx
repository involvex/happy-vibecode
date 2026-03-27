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
import * as SecureStore from 'expo-secure-store'
import {useAuth} from '../../hooks/useAuth'
import {useRouter} from 'expo-router'
const BRIDGE_CODE_KEY = 'happy-bridge-code'

let _nextId = 0
function uniqueId(): string {
	return String(++_nextId)
}

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
	const [bridgeCode, setBridgeCode] = useState<string | null>(null)
	const [bridgeCodeInput, setBridgeCodeInput] = useState('')
	const [bridgeCodeLoaded, setBridgeCodeLoaded] = useState(false)
	const wsRef = useRef<WebSocket | null>(null)
	const flatListRef = useRef<FlatList>(null)
	const bridgeCodeRef = useRef(bridgeCode)
	const serverUrlRef = useRef(serverUrl)
	const apiTokenRef = useRef(apiToken)

	bridgeCodeRef.current = bridgeCode
	serverUrlRef.current = serverUrl
	apiTokenRef.current = apiToken

	// Load bridge code from SecureStore
	useEffect(() => {
		SecureStore.getItemAsync(BRIDGE_CODE_KEY).then(code => {
			if (code) setBridgeCode(code)
			setBridgeCodeLoaded(true)
		})
	}, [])

	const saveBridgeCode = useCallback(async (code: string) => {
		const upper = code.toUpperCase()
		await SecureStore.setItemAsync(BRIDGE_CODE_KEY, upper)
		setBridgeCode(upper)
	}, [])

	const clearBridgeCode = useCallback(async () => {
		await SecureStore.deleteItemAsync(BRIDGE_CODE_KEY)
		setBridgeCode(null)
		wsRef.current?.close()
	}, [])

	const handlePair = useCallback(() => {
		const code = bridgeCodeInput.trim()
		if (!code) return
		saveBridgeCode(code)
		setBridgeCodeInput('')
	}, [bridgeCodeInput, saveBridgeCode])

	const roomId = bridgeCode ?? userId ?? 'pending'

	const onRefresh = useCallback(() => {
		setRefreshing(true)
		wsRef.current?.close()
		setCliConnected(false)

		const code = bridgeCodeRef.current
		if (!code) {
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
			`${host}/agents/BridgeAgent/${code}?type=mobile${tokenParam}`,
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
					setCliConnected(msg.status === 'cli_connected')
					if (msg.status === 'cli_disconnected') setCliConnected(false)
				}
			} catch {}
		}
		ws.onclose = () => setCliConnected(false)
		setTimeout(() => setRefreshing(false), 2000)
	}, [])

	useEffect(() => {
		if (!isAuthed || !bridgeCodeLoaded) return

		const host = (
			serverUrl ?? 'https://happy-vibecode.involvex.workers.dev'
		).replace('http', 'ws')
		const tokenParam = apiToken ? `&token=${encodeURIComponent(apiToken)}` : ''
		const ws = new WebSocket(
			`${host}/agents/BridgeAgent/${roomId}?type=mobile${tokenParam}`,
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
					setCliConnected(msg.status === 'cli_connected')
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
								id: uniqueId(),
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
							id: uniqueId(),
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
	}, [isAuthed, bridgeCodeLoaded, roomId, apiToken, serverUrl])

	if (!isAuthed) {
		return (
			<SafeAreaView className="items-center justify-center flex-1 bg-surface">
				<Text className="mb-4 text-lg text-text">
					Sign in to start chatting
				</Text>
				<TouchableOpacity
					className="px-6 py-3 bg-primary rounded-xl"
					onPress={() => router.push('/(tabs)/settings')}
				>
					<Text className="font-semibold text-white">Go to Settings</Text>
				</TouchableOpacity>
			</SafeAreaView>
		)
	}

	if (!bridgeCode) {
		return (
			<SafeAreaView className="items-center justify-center flex-1 px-6 bg-surface">
				<Text className="mb-2 text-lg font-semibold text-text">
					Pair with CLI
				</Text>
				<Text className="mb-6 text-sm text-center text-muted">
					Run{'\n'}happy-vibecode connect {'<agent>'}
					{'\n'}to get a bridge code, then enter it below.
				</Text>
				<View className="flex-row items-center w-full gap-2">
					<TextInput
						className="flex-1 px-4 py-3 font-mono text-lg tracking-widest text-center uppercase border bg-card border-border rounded-xl text-text"
						placeholder="8-char code"
						placeholderTextColor="#94a3b8"
						value={bridgeCodeInput}
						onChangeText={text => setBridgeCodeInput(text.toUpperCase())}
						onSubmitEditing={handlePair}
						maxLength={8}
						autoCapitalize="characters"
						autoCorrect={false}
					/>
					<TouchableOpacity
						className={`px-5 py-3 rounded-xl ${bridgeCodeInput.trim().length >= 4 ? 'bg-primary' : 'bg-border'}`}
						onPress={handlePair}
						disabled={bridgeCodeInput.trim().length < 4}
					>
						<Text className="font-semibold text-white">Pair</Text>
					</TouchableOpacity>
				</View>
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
			sessionId: roomId,
		}
		ws.send(JSON.stringify(msg))

		setMessages(prev => [...prev, {id: uniqueId(), role: 'user', content}])
		setInput('')

		setTimeout(() => flatListRef.current?.scrollToEnd({animated: true}), 100)
	}

	return (
		<SafeAreaView className="flex-1 bg-surface">
			{/* Header */}
			<View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
				<View className="flex-row items-center gap-2">
					<Text className="text-lg font-semibold text-text">Chat</Text>
					<View className="bg-border rounded px-1.5 py-0.5">
						<Text className="font-mono text-xs text-muted">{bridgeCode}</Text>
					</View>
				</View>
				<View className="flex-row items-center gap-2">
					<TouchableOpacity onPress={clearBridgeCode}>
						<Text className="text-xs text-muted">Unpair</Text>
					</TouchableOpacity>
					<View
						className={`w-2 h-2 rounded-full ${cliConnected ? 'bg-success' : 'bg-muted'}`}
					/>
					<Text className="text-xs text-muted">
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
						<View className="items-center justify-center flex-1 py-12">
							<Text className="text-center text-muted">
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
						className="flex-1 px-4 py-3 text-sm border bg-card border-border rounded-2xl text-text"
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
						<Text className="text-lg text-white">↑</Text>
					</TouchableOpacity>
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	)
}
