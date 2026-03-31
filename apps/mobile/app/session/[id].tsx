import {
	FlatList,
	KeyboardAvoidingView,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native'
import {useOpencodeClient} from '../../hooks/useOpencodeClient'
import {AgentControls} from '../../components/AgentControls'
import {SafeAreaView} from 'react-native-safe-area-context'
import {useLocalSearchParams, useRouter} from 'expo-router'
import {useEffect, useRef, useState} from 'react'
import * as SecureStore from 'expo-secure-store'
import {useAuth} from '../../hooks/useAuth'
import {Ionicons} from '@expo/vector-icons'

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

interface LogEntry {
	id: string
	content: string
	level: string
}

export default function SessionScreen() {
	const {id} = useLocalSearchParams<{id: string}>()
	const router = useRouter()
	const {userId, apiToken, serverUrl} = useAuth()

	const [messages, setMessages] = useState<Message[]>([])
	const [input, setInput] = useState('')
	const [connected, setConnected] = useState(false)
	const [cliConnected, setCliConnected] = useState(false)
	const [bridgeCode, setBridgeCode] = useState<string | null>(null)
	const [logs, setLogs] = useState<LogEntry[]>([])
	const [agentStatus, setAgentStatus] = useState<string | null>(null)
	const [opencodeUrl, setOpencodeUrl] = useState<string | null>(null)
	const wsRef = useRef<WebSocket | null>(null)
	const flatListRef = useRef<FlatList>(null)

	const opencode = useOpencodeClient(opencodeUrl)

	useEffect(() => {
		SecureStore.getItemAsync(BRIDGE_CODE_KEY).then(code => {
			if (code) setBridgeCode(code)
		})
	}, [])

	const roomId = id ?? bridgeCode ?? userId ?? 'default'

	useEffect(() => {
		const host = (
			serverUrl ?? 'https://happy-vibecode.involvex.workers.dev'
		).replace('http', 'ws')
		const tokenParam = apiToken ? `&token=${encodeURIComponent(apiToken)}` : ''
		const ws = new WebSocket(
			`${host}/agents/BridgeAgent/${roomId}?type=mobile${tokenParam}`,
		)
		wsRef.current = ws

		ws.onopen = () => {
			setConnected(true)
			ws.send(JSON.stringify({type: 'ping'}))
		}

		ws.onclose = () => {
			setConnected(false)
			setCliConnected(false)
			setOpencodeUrl(null)
		}

		ws.onmessage = event => {
			try {
				const msg = JSON.parse(event.data as string) as {
					type: string
					content?: string
					done?: boolean
					status?: string
					message?: string
					level?: string
					sessionId?: string
					url?: string
				}

				if (msg.type === 'opencode_url' && msg.url) {
					setOpencodeUrl(msg.url)
					return
				}

				if (msg.type === 'status') {
					setCliConnected(msg.status === 'cli_connected')
					if (msg.status === 'cli_disconnected') {
						setCliConnected(false)
						setAgentStatus(null)
					}
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
					setTimeout(
						() => flatListRef.current?.scrollToEnd({animated: true}),
						80,
					)
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

				if (msg.type === 'agent_logs' && msg.content) {
					setLogs(prev => [
						...prev,
						{
							id: uniqueId(),
							content: msg.content ?? '',
							level: msg.level ?? 'info',
						},
					])
				}

				if (msg.type === 'agent_status_update' && msg.status) {
					setAgentStatus(msg.status)
				}
			} catch {
				// ignore
			}
		}

		return () => ws.close()
	}, [roomId, apiToken, serverUrl])

	const sendWsMessage = (msg: object) => {
		if (wsRef.current?.readyState === WebSocket.OPEN) {
			wsRef.current.send(JSON.stringify(msg))
		}
	}

	const send = () => {
		const content = input.trim()
		if (!content || wsRef.current?.readyState !== WebSocket.OPEN) return

		wsRef.current.send(
			JSON.stringify({type: 'prompt', content, sessionId: roomId}),
		)
		setMessages(prev => [...prev, {id: uniqueId(), role: 'user', content}])
		setInput('')
		setTimeout(() => flatListRef.current?.scrollToEnd({animated: true}), 80)
	}

	return (
		<SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark">
			{/* Header */}
			<View className="flex-row items-center gap-3 px-4 py-3 border-b border-border dark:border-border-dark">
				<TouchableOpacity onPress={() => router.back()}>
					<Ionicons name="arrow-back" size={22} color="#7c3aed" />
				</TouchableOpacity>
				<View className="flex-1">
					<Text
						className="text-base font-semibold text-text dark:text-text-dark"
						numberOfLines={1}
					>
						Session {roomId.slice(0, 8)}…
					</Text>
					<View className="flex-row items-center gap-1.5 mt-0.5">
						<View
							className={`w-1.5 h-1.5 rounded-full ${connected ? (cliConnected ? 'bg-success' : 'bg-warning') : 'bg-error'}`}
						/>
						<Text className="text-xs text-muted dark:text-muted-dark">
							{connected
								? cliConnected
									? 'Agent connected'
									: 'Waiting for agent'
								: 'Disconnected'}
						</Text>
					</View>
				</View>
			</View>

			{/* opencode serve status (shown when CLI has an active opencode server) */}
			{opencodeUrl ? (
				<View className="flex-row items-center gap-1.5 px-4 py-1.5 bg-success/10 border-b border-success/20">
					<View className="w-1.5 h-1.5 rounded-full bg-success" />
					<Text
						className="text-xs font-mono text-success flex-1"
						numberOfLines={1}
					>
						{opencodeUrl}
					</Text>
					<Text className="text-xs text-muted dark:text-muted-dark ml-1">
						{opencode.mode === 'direct' ? '⚡ direct' : '🌐 bridge'}
					</Text>
				</View>
			) : null}

			<KeyboardAvoidingView className="flex-1" behavior="padding">
				<FlatList
					ref={flatListRef}
					data={messages}
					keyExtractor={item => item.id}
					className="flex-1 px-4"
					contentContainerStyle={{paddingVertical: 12, gap: 8}}
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
							<Text
								className={
									item.role === 'user'
										? 'text-white text-sm leading-5'
										: item.role === 'system'
											? 'text-xs text-warning text-center'
											: 'text-text dark:text-text-dark text-sm leading-5'
								}
							>
								{item.content}
							</Text>
							{item.role === 'assistant' && !item.done && (
								<Text className="mt-1 text-xs text-muted dark:text-muted-dark">
									●
								</Text>
							)}
						</View>
					)}
					ListEmptyComponent={
						<View className="items-center py-12">
							<Text className="text-sm text-center text-muted dark:text-muted-dark">
								No messages yet
							</Text>
						</View>
					}
				/>

				{/* Agent controls */}
				{cliConnected && (
					<AgentControls
						connected={connected}
						cliConnected={cliConnected}
						sessionId={roomId}
						onSend={sendWsMessage}
						logs={logs}
						agentStatus={agentStatus}
					/>
				)}

				<View className="flex-row items-end gap-2 px-4 py-3 border-t border-border dark:border-border-dark">
					<TextInput
						className="flex-1 px-4 py-3 text-sm border bg-card dark:bg-card-dark border-border dark:border-border-dark rounded-2xl text-text dark:text-text-dark"
						placeholder="Type a message…"
						placeholderTextColor="#94a3b8"
						value={input}
						onChangeText={setInput}
						multiline
						maxLength={4000}
						style={{maxHeight: 120}}
						accessibilityLabel="Message input"
					/>
					<TouchableOpacity
						className={`w-10 h-10 rounded-full items-center justify-center ${input.trim() ? 'bg-primary' : 'bg-border dark:bg-border-dark'}`}
						onPress={send}
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
