import {
	PaperPlaneRightIcon,
	StopIcon,
	TrashIcon,
	ChatCircleDotsIcon,
	CircleIcon,
	MoonIcon,
	SunIcon,
	BugIcon,
} from '@phosphor-icons/react'
import {Suspense, useCallback, useState, useEffect, useRef} from 'react'
import {Button, Badge, InputArea, Empty, Text} from '@cloudflare/kumo'
import {Switch} from '@cloudflare/kumo'
import {Streamdown} from 'streamdown'

// ── Small components ──────────────────────────────────────────────────

type ThemePreference = 'system' | 'light' | 'dark'

function applyTheme(pref: ThemePreference) {
	const dark =
		pref === 'dark' ||
		(pref === 'system' &&
			window.matchMedia('(prefers-color-scheme: dark)').matches)
	const mode = dark ? 'dark' : 'light'
	document.documentElement.setAttribute('data-mode', mode)
	document.documentElement.style.colorScheme = mode
}

function ThemeToggle() {
	const [pref, setPref] = useState<ThemePreference>(
		() => (localStorage.getItem('theme') as ThemePreference) || 'system',
	)

	useEffect(() => {
		applyTheme(pref)
		if (pref !== 'system') return
		const mq = window.matchMedia('(prefers-color-scheme: dark)')
		const handler = () => applyTheme('system')
		mq.addEventListener('change', handler)
		return () => mq.removeEventListener('change', handler)
	}, [pref])

	const cycle = useCallback(() => {
		const order: ThemePreference[] = ['system', 'light', 'dark']
		const next = order[(order.indexOf(pref) + 1) % order.length]
		setPref(next)
		localStorage.setItem('theme', next)
	}, [pref])

	const icon =
		pref === 'system' ? (
			<CircleIcon size={16} weight="duotone" />
		) : pref === 'dark' ? (
			<SunIcon size={16} />
		) : (
			<MoonIcon size={16} />
		)

	return (
		<Button
			variant="secondary"
			shape="square"
			icon={icon}
			onClick={cycle}
			aria-label={`Theme: ${pref}`}
		/>
	)
}

// ── Types ─────────────────────────────────────────────────────────────

interface ChatMessage {
	id: string
	role: 'user' | 'assistant'
	content: string
}

type BridgeStatus =
	| 'disconnected'
	| 'connected'
	| 'cli_connected'
	| 'cli_disconnected'

// ── WebSocket bridge hook ─────────────────────────────────────────────

function getOrCreateRoomId(): string {
	// Prefer userId if the user is authenticated
	const userId = localStorage.getItem('happy-user-id')
	if (userId) return userId
	const key = 'bridge-room-id'
	let id = localStorage.getItem(key)
	if (!id) {
		id = crypto.randomUUID()
		localStorage.setItem(key, id)
	}
	return id
}

function useBridgeAgent(roomId: string) {
	const [messages, setMessages] = useState<ChatMessage[]>([])
	const [wsStatus, setWsStatus] = useState<BridgeStatus>('disconnected')
	const [isStreaming, setIsStreaming] = useState(false)
	const wsRef = useRef<WebSocket | null>(null)
	const streamingIdRef = useRef<string | null>(null)

	useEffect(() => {
		const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
		const url = `${proto}://${window.location.host}/agents/BridgeAgent/${roomId}?type=web`
		const ws = new WebSocket(url)
		wsRef.current = ws

		ws.onopen = () => setWsStatus('connected')
		ws.onclose = () => {
			setWsStatus('disconnected')
			setIsStreaming(false)
		}
		ws.onerror = e => console.error('BridgeAgent WS error:', e)

		ws.onmessage = (ev: MessageEvent) => {
			try {
				const msg = JSON.parse(String(ev.data)) as {
					type: string
					content?: string
					done?: boolean
					message?: string
					status?: string
				}

				if (msg.type === 'response') {
					const chunk = msg.content ?? ''
					if (!streamingIdRef.current) {
						const id = crypto.randomUUID()
						streamingIdRef.current = id
						setIsStreaming(true)
						setMessages(prev => [
							...prev,
							{id, role: 'assistant', content: chunk},
						])
					} else {
						const id = streamingIdRef.current
						setMessages(prev =>
							prev.map(m =>
								m.id === id ? {...m, content: m.content + chunk} : m,
							),
						)
					}
					if (msg.done) {
						streamingIdRef.current = null
						setIsStreaming(false)
					}
				} else if (msg.type === 'status') {
					const s = msg.status ?? ''
					if (s === 'cli_connected') setWsStatus('cli_connected')
					else if (s === 'cli_disconnected') setWsStatus('cli_disconnected')
				} else if (msg.type === 'error') {
					const id = crypto.randomUUID()
					setMessages(prev => [
						...prev,
						{id, role: 'assistant', content: `⚠️ ${msg.message ?? 'Error'}`},
					])
					setIsStreaming(false)
					streamingIdRef.current = null
				}
			} catch {
				// ignore non-JSON
			}
		}

		return () => ws.close()
	}, [roomId])

	const sendMessage = useCallback((content: string) => {
		if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
		// Optimistically add user message
		setMessages(prev => [
			...prev,
			{id: crypto.randomUUID(), role: 'user' as const, content},
		])
		wsRef.current.send(JSON.stringify({type: 'prompt', content}))
	}, [])

	const stop = useCallback(() => {
		if (wsRef.current?.readyState === WebSocket.OPEN) {
			wsRef.current.send(JSON.stringify({type: 'stop'}))
		}
		setIsStreaming(false)
		streamingIdRef.current = null
	}, [])

	const clearHistory = useCallback(() => {
		setMessages([])
		streamingIdRef.current = null
		setIsStreaming(false)
	}, [])

	return {messages, wsStatus, isStreaming, sendMessage, stop, clearHistory}
}

// ── Main chat ─────────────────────────────────────────────────────────

function ChatInner({roomId: roomIdProp}: {roomId?: string}) {
	const [input, setInput] = useState('')
	const [showDebug, setShowDebug] = useState(false)
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const [roomId] = useState(() => roomIdProp ?? getOrCreateRoomId())

	const {messages, wsStatus, isStreaming, sendMessage, stop, clearHistory} =
		useBridgeAgent(roomId)

	const connected = wsStatus !== 'disconnected'

	const handleStop = useCallback(() => {
		stop()
	}, [stop])

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({behavior: 'smooth'})
	}, [messages])

	useEffect(() => {
		if (!isStreaming && textareaRef.current) {
			textareaRef.current.focus()
		}
	}, [isStreaming])

	const send = useCallback(() => {
		const text = input.trim()
		if (!text || isStreaming) return
		setInput('')
		sendMessage(text)
		if (textareaRef.current) {
			textareaRef.current.style.height = 'auto'
		}
	}, [input, isStreaming, sendMessage])

	return (
		<div className="flex flex-col h-full bg-kumo-elevated">
			{/* Header */}
			<header className="px-5 py-4 bg-kumo-base border-b border-kumo-line">
				<div className="max-w-3xl mx-auto flex items-center justify-between">
					<div className="flex items-center gap-3">
						<h1 className="text-lg font-semibold text-kumo-default">
							<span className="mr-2">⛅</span>Agent Chat
						</h1>
						<Badge variant="secondary">
							<ChatCircleDotsIcon size={12} weight="bold" className="mr-1" />
							{wsStatus === 'cli_connected' ? 'CLI Connected' : 'Bridge'}
						</Badge>
					</div>
					<div className="flex items-center gap-3">
						<div className="flex items-center gap-1.5">
							<CircleIcon
								size={8}
								weight="fill"
								className={
									wsStatus === 'cli_connected'
										? 'text-kumo-success'
										: wsStatus === 'connected' ||
											  wsStatus === 'cli_disconnected'
											? 'text-yellow-400'
											: 'text-kumo-danger'
								}
							/>
							<Text size="xs" variant="secondary">
								{wsStatus === 'cli_connected'
									? 'CLI ready'
									: wsStatus === 'cli_disconnected'
										? 'Waiting for CLI'
										: wsStatus === 'connected'
											? 'Bridge connected'
											: 'Disconnected'}
							</Text>
						</div>
						<div className="flex items-center gap-1.5">
							<BugIcon size={14} className="text-kumo-inactive" />
							<Switch
								checked={showDebug}
								onCheckedChange={setShowDebug}
								size="sm"
								aria-label="Toggle debug mode"
							/>
						</div>
						<ThemeToggle />
						<Button
							variant="secondary"
							icon={<TrashIcon size={16} />}
							onClick={clearHistory}
						>
							Clear
						</Button>
					</div>
				</div>
			</header>

			{/* Messages */}
			<div className="flex-1 overflow-y-auto">
				<div className="max-w-3xl mx-auto px-5 py-6 space-y-5">
					{messages.length === 0 && (
						<Empty
							icon={<ChatCircleDotsIcon size={32} />}
							title="Start a conversation"
							contents={
								<div className="flex flex-wrap justify-center gap-2">
									{[
										'Hello, what can you do?',
										'What is 42 * 7?',
										'Write a haiku about Cloudflare',
										'Explain Durable Objects in one sentence',
									].map(prompt => (
										<Button
											key={prompt}
											variant="outline"
											size="sm"
											disabled={isStreaming || !connected}
											onClick={() => sendMessage(prompt)}
										>
											{prompt}
										</Button>
									))}
								</div>
							}
						/>
					)}

					{messages.map((message: ChatMessage, index: number) => {
						const isUser = message.role === 'user'
						const isLastAssistant =
							message.role === 'assistant' && index === messages.length - 1

						return (
							<div key={message.id} className="space-y-2">
								{showDebug && (
									<pre className="text-[11px] text-kumo-subtle bg-kumo-control rounded-lg p-3 overflow-auto max-h-64">
										{JSON.stringify(message, null, 2)}
									</pre>
								)}

								{isUser ? (
									<div className="flex justify-end">
										<div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-br-md bg-kumo-contrast text-kumo-inverse leading-relaxed">
											{message.content}
										</div>
									</div>
								) : (
									<div className="flex justify-start">
										<div className="max-w-[85%] rounded-2xl rounded-bl-md bg-kumo-base text-kumo-default leading-relaxed">
											<Streamdown
												className="sd-theme rounded-2xl rounded-bl-md p-3"
												controls={false}
												isAnimating={isLastAssistant && isStreaming}
											>
												{message.content}
											</Streamdown>
										</div>
									</div>
								)}
							</div>
						)
					})}

					<div ref={messagesEndRef} />
				</div>
			</div>

			{/* Input */}
			<div className="border-t border-kumo-line bg-kumo-base">
				<form
					onSubmit={e => {
						e.preventDefault()
						send()
					}}
					className="max-w-3xl mx-auto px-5 py-4"
				>
					<div className="flex items-end gap-3 rounded-xl border border-kumo-line bg-kumo-base p-3 shadow-sm focus-within:ring-2 focus-within:ring-kumo-ring focus-within:border-transparent transition-shadow">
						<InputArea
							ref={textareaRef}
							value={input}
							onValueChange={setInput}
							onKeyDown={e => {
								if (e.key === 'Enter' && !e.shiftKey) {
									e.preventDefault()
									send()
								}
							}}
							onInput={e => {
								const el = e.currentTarget
								el.style.height = 'auto'
								el.style.height = `${el.scrollHeight}px`
							}}
							placeholder="Send a message..."
							disabled={!connected || isStreaming}
							rows={1}
							className="flex-1 !ring-0 focus:!ring-0 !shadow-none !bg-transparent !outline-none resize-none max-h-40"
						/>
						{isStreaming ? (
							<Button
								type="button"
								variant="secondary"
								shape="square"
								aria-label="Stop generation"
								icon={<StopIcon size={18} />}
								onClick={handleStop}
								className="mb-0.5"
							/>
						) : (
							<Button
								type="submit"
								variant="primary"
								shape="square"
								aria-label="Send message"
								disabled={!input.trim() || !connected}
								icon={<PaperPlaneRightIcon size={18} />}
								className="mb-0.5"
							/>
						)}
					</div>
				</form>
			</div>
		</div>
	)
}

export default function Chat({roomId}: {roomId?: string}) {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center h-screen text-kumo-inactive">
					Loading...
				</div>
			}
		>
			<ChatInner roomId={roomId} />
		</Suspense>
	)
}
