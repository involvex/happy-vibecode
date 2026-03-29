import {
	Animated,
	FlatList,
	KeyboardAvoidingView,
	RefreshControl,
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native'
import {useCallback, useEffect, useRef, useState} from 'react'
import {usePromptPresets} from '../../hooks/usePromptPresets'
import {SafeAreaView} from 'react-native-safe-area-context'
import * as SecureStore from 'expo-secure-store'
import {useAuth} from '../../hooks/useAuth'
import {Ionicons} from '@expo/vector-icons'
import {useColorScheme} from 'nativewind'
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

function TypingIndicator() {
	const {colorScheme} = useColorScheme()
	const isDark = colorScheme === 'dark'
	const dot1 = useRef(new Animated.Value(0)).current
	const dot2 = useRef(new Animated.Value(0)).current
	const dot3 = useRef(new Animated.Value(0)).current

	useEffect(() => {
		const makeAnim = (dot: Animated.Value, delay: number) =>
			Animated.loop(
				Animated.sequence([
					Animated.delay(delay),
					Animated.timing(dot, {
						toValue: 1,
						duration: 280,
						useNativeDriver: true,
					}),
					Animated.timing(dot, {
						toValue: 0,
						duration: 280,
						useNativeDriver: true,
					}),
					Animated.delay(840 - delay),
				]),
			)
		const anim = Animated.parallel([
			makeAnim(dot1, 0),
			makeAnim(dot2, 140),
			makeAnim(dot3, 280),
		])
		anim.start()
		return () => anim.stop()
	}, [dot1, dot2, dot3])

	const dotStyle = (anim: Animated.Value) => ({
		width: 7,
		height: 7,
		borderRadius: 4,
		backgroundColor: isDark ? '#94a3b8' : '#64748b',
		marginHorizontal: 2,
		opacity: anim.interpolate({inputRange: [0, 1], outputRange: [0.3, 1]}),
		transform: [
			{
				translateY: anim.interpolate({
					inputRange: [0, 1],
					outputRange: [0, -4],
				}),
			},
		],
	})

	return (
		<View
			style={{
				flexDirection: 'row',
				alignItems: 'center',
				padding: 12,
				borderRadius: 16,
				backgroundColor: isDark ? '#16213e' : '#ffffff',
				borderWidth: 1,
				borderColor: isDark ? '#2a2a4a' : '#e2e8f0',
				alignSelf: 'flex-start',
				marginBottom: 8,
			}}
		>
			<Animated.View style={dotStyle(dot1)} />
			<Animated.View style={dotStyle(dot2)} />
			<Animated.View style={dotStyle(dot3)} />
		</View>
	)
}

export default function ChatTab() {
	const {isAuthed, userId, apiToken, serverUrl} = useAuth()
	const router = useRouter()
	const {presets} = usePromptPresets()

	const [messages, setMessages] = useState<Message[]>([])
	const [input, setInput] = useState('')
	const [cliConnected, setCliConnected] = useState(false)
	const [refreshing, setRefreshing] = useState(false)
	const [bridgeCode, setBridgeCode] = useState<string | null>(null)
	const [bridgeCodeInput, setBridgeCodeInput] = useState('')
	const [bridgeCodeLoaded, setBridgeCodeLoaded] = useState(false)
	const [isAgentTyping, setIsAgentTyping] = useState(false)

	const wsRef = useRef<WebSocket | null>(null)
	const flatListRef = useRef<FlatList>(null)
	const bridgeCodeRef = useRef(bridgeCode)
	const serverUrlRef = useRef(serverUrl)
	const apiTokenRef = useRef(apiToken)
	const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

	useEffect(() => {
		return () => {
			if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
		}
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
					if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
					setIsAgentTyping(!msg.done)
					if (!msg.done) {
						typingTimerRef.current = setTimeout(
							() => setIsAgentTyping(false),
							8000,
						)
					}
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
					setTimeout(
						() => flatListRef.current?.scrollToEnd({animated: true}),
						50,
					)
				}

				if (msg.type === 'error') {
					setIsAgentTyping(false)
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
			<SafeAreaView
				className="flex-1 items-center justify-center bg-surface dark:bg-surface-dark"
				edges={['top']}
			>
				<Text className="mb-4 text-lg text-text dark:text-text-dark">
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
			<KeyboardAvoidingView className="flex-1" behavior="padding">
				<SafeAreaView
					className="flex-1 items-center justify-center px-6 bg-surface dark:bg-surface-dark"
					edges={['top']}
				>
					<View className="w-16 h-16 rounded-2xl bg-primary/20 items-center justify-center mb-6">
						<Text className="text-3xl">🔗</Text>
					</View>
					<Text className="mb-2 text-xl font-bold text-text dark:text-text-dark">
						Pair with CLI
					</Text>
					<Text className="mb-8 text-sm text-center text-muted dark:text-muted-dark leading-5">
						Run{' '}
						<Text className="font-mono text-primary">
							vibe connect &lt;agent&gt;
						</Text>{' '}
						in your terminal, then enter the 8-character bridge code.
					</Text>
					<View className="flex-row items-center w-full gap-3">
						<TextInput
							className="flex-1 px-4 py-3.5 font-mono text-lg tracking-widest text-center uppercase border bg-card dark:bg-card-dark border-border dark:border-border-dark rounded-2xl text-text dark:text-text-dark"
							placeholder="XXXXXXXX"
							placeholderTextColor="#94a3b8"
							value={bridgeCodeInput}
							onChangeText={text => setBridgeCodeInput(text.toUpperCase())}
							onSubmitEditing={handlePair}
							maxLength={8}
							autoCapitalize="characters"
							autoCorrect={false}
							returnKeyType="done"
						/>
						<TouchableOpacity
							className={`px-5 py-3.5 rounded-2xl ${
								bridgeCodeInput.trim().length >= 4
									? 'bg-primary'
									: 'bg-border dark:bg-border-dark'
							}`}
							onPress={handlePair}
							disabled={bridgeCodeInput.trim().length < 4}
						>
							<Text className="font-semibold text-white">Pair</Text>
						</TouchableOpacity>
					</View>
					<Text className="mt-4 text-xs text-muted dark:text-muted-dark text-center">
						Bridge codes expire after 15 minutes of inactivity
					</Text>
				</SafeAreaView>
			</KeyboardAvoidingView>
		)
	}

	const sendMessage = (text?: string) => {
		const content = (text ?? input).trim()
		if (!content || !wsRef.current) return
		const ws = wsRef.current
		if (ws.readyState !== WebSocket.OPEN) return

		ws.send(JSON.stringify({type: 'prompt', content, sessionId: roomId}))
		setMessages(prev => [...prev, {id: uniqueId(), role: 'user', content}])
		setInput('')
		setIsAgentTyping(true)
		setTimeout(() => flatListRef.current?.scrollToEnd({animated: true}), 100)
	}

	return (
		<SafeAreaView
			className="flex-1 bg-surface dark:bg-surface-dark"
			edges={['top']}
		>
			{/* Header */}
			<View className="flex-row items-center justify-between px-4 py-3 border-b border-border dark:border-border-dark">
				<View className="flex-row items-center gap-2">
					<Text className="text-lg font-semibold text-text dark:text-text-dark">
						Chat
					</Text>
					<View className="bg-border dark:bg-border-dark rounded px-1.5 py-0.5">
						<Text className="font-mono text-xs text-muted dark:text-muted-dark">
							{bridgeCode}
						</Text>
					</View>
				</View>
				<View className="flex-row items-center gap-3">
					<TouchableOpacity
						onPress={clearBridgeCode}
						className="px-3 py-2"
						accessibilityLabel="Disconnect from CLI bridge"
					>
						<Text className="text-xs text-muted dark:text-muted-dark">
							Unpair
						</Text>
					</TouchableOpacity>
					<View className="flex-row items-center gap-1.5">
						<View
							className={`w-2 h-2 rounded-full ${cliConnected ? 'bg-success' : 'bg-muted dark:bg-muted-dark'}`}
						/>
						<Text className="text-xs text-muted dark:text-muted-dark">
							{cliConnected ? 'Connected' : 'No agent'}
						</Text>
					</View>
				</View>
			</View>

			<KeyboardAvoidingView className="flex-1" behavior="padding">
				{/* Messages */}
				<FlatList
					ref={flatListRef}
					data={messages}
					keyExtractor={item => item.id}
					className="flex-1 px-4"
					contentContainerStyle={{paddingTop: 12, paddingBottom: 4, gap: 8}}
					refreshControl={
						<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
					}
					renderItem={({item}) => (
						<View
							className={`max-w-[85%] rounded-2xl px-4 py-3 ${
								item.role === 'user'
									? 'self-end bg-primary'
									: item.role === 'system'
										? 'self-center bg-warning/20 border border-warning/30'
										: 'self-start bg-card dark:bg-card-dark border border-border dark:border-border-dark'
							}`}
						>
							{item.role === 'system' ? (
								<Text className="text-xs text-warning text-center">
									{item.content}
								</Text>
							) : (
								<Text
									className={
										item.role === 'user'
											? 'text-white text-sm leading-5'
											: 'text-text dark:text-text-dark text-sm leading-5'
									}
									selectable
								>
									{item.content}
								</Text>
							)}
						</View>
					)}
					ListFooterComponent={isAgentTyping ? <TypingIndicator /> : null}
					ListEmptyComponent={
						<View className="items-center justify-center py-16">
							<Text className="text-5xl mb-4">
								{cliConnected ? '💬' : '🔌'}
							</Text>
							<Text className="text-center text-text dark:text-text-dark text-base font-medium mb-2">
								{cliConnected ? 'Agent ready' : 'Waiting for agent'}
							</Text>
							<Text className="text-center text-muted dark:text-muted-dark text-sm leading-5">
								{cliConnected
									? 'Type a message or tap a preset below'
									: 'Run "vibe connect <agent>" in your terminal'}
							</Text>
						</View>
					}
				/>

				{/* Preset chips */}
				{presets.length > 0 && (
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						className="border-t border-border dark:border-border-dark max-h-14"
						contentContainerStyle={{
							paddingHorizontal: 12,
							paddingVertical: 8,
							gap: 8,
						}}
					>
						{presets.map(preset => (
							<TouchableOpacity
								key={preset.id}
								className="bg-card dark:bg-card-dark border border-border dark:border-border-dark rounded-full px-3 py-1.5"
								onPress={() => setInput(preset.text)}
							>
								<Text className="text-xs text-text dark:text-text-dark">
									{preset.label}
								</Text>
							</TouchableOpacity>
						))}
					</ScrollView>
				)}

				{/* Input bar */}
				<View className="flex-row items-end gap-2 px-4 py-3 border-t border-border dark:border-border-dark">
					<TextInput
						className="flex-1 px-4 py-3 text-sm border bg-card dark:bg-card-dark border-border dark:border-border-dark rounded-2xl text-text dark:text-text-dark"
						placeholder="Type a message…"
						placeholderTextColor="#94a3b8"
						value={input}
						onChangeText={setInput}
						multiline
						maxLength={4000}
						blurOnSubmit={false}
						style={{maxHeight: 120}}
						accessibilityLabel="Message input"
					/>
					<TouchableOpacity
						className={`w-10 h-10 rounded-full items-center justify-center ${
							input.trim() ? 'bg-primary' : 'bg-border dark:bg-border-dark'
						}`}
						onPress={() => sendMessage()}
						disabled={!input.trim()}
						accessibilityLabel="Send message"
					>
						<Ionicons name="arrow-up" size={18} color="white" />
					</TouchableOpacity>
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	)
}
