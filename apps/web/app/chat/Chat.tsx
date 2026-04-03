'use client'

import {
	PaperPlaneRightIcon,
	StopIcon,
	TrashIcon,
	ChatCircleDotsIcon,
	CircleIcon,
	MoonIcon,
	SunIcon,
	BugIcon,
	LinkIcon,
	LinkBreakIcon,
	TerminalWindowIcon,
} from '@phosphor-icons/react'
import {Suspense, useCallback, useState, useEffect, useRef} from 'react'
import {Button, Badge, InputArea, Empty, Text} from '@cloudflare/kumo'
import {ModelSettingsModal} from '../components/ModelSettingsModal'
import {ModelSelector} from '../components/ModelSelector'
import {useWorkspaces} from '../hooks/useWorkspaces'
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
	model?: string
}

type BridgeStatus =
	| 'disconnected'
	| 'connected'
	| 'cli_connected'
	| 'cli_disconnected'
	| 'reconnecting'

// ── Bridge code helpers ────────────────────────────────────────────────

const BRIDGE_CODE_KEY = 'happy-bridge-code'

function getBridgeCode(): string | null {
	return localStorage.getItem(BRIDGE_CODE_KEY)
}

function setBridgeCode(code: string): void {
	localStorage.setItem(BRIDGE_CODE_KEY, code.toUpperCase())
}

// ── WebSocket bridge hook ─────────────────────────────────────────────

function useBridgeAgent(roomId: string) {
	const [messages, setMessages] = useState<ChatMessage[]>([])
	const [wsStatus, setWsStatus] = useState<BridgeStatus>('disconnected')
	const [isStreaming, setIsStreaming] = useState(false)
	const [opencodeUrl, setOpencodeUrl] = useState<string | null>(null)
	const [currentModel, setCurrentModel] = useState<{
		provider: string
		model: string
	} | null>(null)
	const [terminalLines, setTerminalLines] = useState<string[]>([])
	const currentModelRef = useRef<{provider: string; model: string} | null>(null)
	const wsRef = useRef<WebSocket | null>(null)
	const streamingIdRef = useRef<string | null>(null)
	const reconnectAttemptsRef = useRef(0)
	const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const intentionalCloseRef = useRef(false)
	const pendingMessagesRef = useRef<Array<{content: string}>>([])
	const roomIdRef = useRef(roomId)

	roomIdRef.current = roomId

	const MAX_RECONNECT = 5

	const connectWs = useCallback(() => {
		if (!roomIdRef.current) return
		const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
		const apiToken = localStorage.getItem('happy-api-token')
		const tokenParam = apiToken ? `&token=${encodeURIComponent(apiToken)}` : ''
		const url = `${proto}://${window.location.host}/agents/BridgeAgent/${roomIdRef.current}?type=web${tokenParam}`
		const ws = new WebSocket(url)
		wsRef.current = ws
		intentionalCloseRef.current = false

		ws.onopen = () => {
			reconnectAttemptsRef.current = 0
			setWsStatus('connected')

			// Flush pending messages
			while (pendingMessagesRef.current.length > 0) {
				const pending = pendingMessagesRef.current.shift()
				if (pending && ws.readyState === WebSocket.OPEN) {
					ws.send(JSON.stringify({type: 'prompt', content: pending.content}))
				}
			}
		}

		ws.onclose = (_ev: CloseEvent) => {
			setIsStreaming(false)
			streamingIdRef.current = null

			if (intentionalCloseRef.current) {
				setWsStatus('disconnected')
				return
			}

			if (reconnectAttemptsRef.current < MAX_RECONNECT) {
				const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 30_000)
				reconnectAttemptsRef.current++
				setWsStatus('reconnecting')
				if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
				reconnectTimerRef.current = setTimeout(() => connectWs(), delay)
			} else {
				setWsStatus('disconnected')
			}
		}

		ws.onerror = () => {
			// Error will trigger close, which handles reconnection
		}

		ws.onmessage = (ev: MessageEvent) => {
			try {
				const msg = JSON.parse(String(ev.data)) as {
					type: string
					content?: string
					done?: boolean
					message?: string
					status?: string
					model?: string
					provider?: string
					success?: boolean
					error?: string
					sessionId?: string
					url?: string
					output?: string
				}

				if (msg.type === 'response') {
					const chunk = msg.content ?? ''
					if (!streamingIdRef.current) {
						const id = crypto.randomUUID()
						streamingIdRef.current = id
						setIsStreaming(true)
						setMessages(prev => [
							...prev,
							{
								id,
								role: 'assistant',
								content: chunk,
								model: currentModelRef.current?.model,
							},
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
					return
				} else if (msg.type === 'error') {
					const id = crypto.randomUUID()
					setMessages(prev => [
						...prev,
						{id, role: 'assistant', content: `⚠️ ${msg.message ?? 'Error'}`},
					])
					setIsStreaming(false)
					streamingIdRef.current = null
				} else if (msg.type === 'model' && msg.model) {
					const updated = {
						provider: currentModelRef.current?.provider ?? 'unknown',
						model: msg.model!,
					}
					setCurrentModel(updated)
					currentModelRef.current = updated
				} else if (msg.type === 'model_switch_ack') {
					if (msg.success && msg.provider && msg.model) {
						const updated = {provider: msg.provider, model: msg.model}
						setCurrentModel(updated)
						currentModelRef.current = updated
					}
				} else if (msg.type === 'opencode_url' && msg.url) {
					setOpencodeUrl(msg.url)
				} else if (msg.type === 'ping') {
					ws.send(JSON.stringify({type: 'pong'}))
				} else if (msg.type === 'agent_logs' && msg.output) {
					setTerminalLines(prev => [...prev.slice(-500), msg.output!])
				}
			} catch {
				// ignore non-JSON
			}
		}
	}, [])

	useEffect(() => {
		if (!roomId) return
		// Reset reconnect on room change
		reconnectAttemptsRef.current = 0
		connectWs()

		return () => {
			intentionalCloseRef.current = true
			if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
			wsRef.current?.close()
		}
	}, [roomId, connectWs])

	const sendMessage = useCallback((content: string) => {
		if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
			// Queue message for when connection is restored
			pendingMessagesRef.current.push({content})
			// Optimistically add user message
			setMessages(prev => [
				...prev,
				{id: crypto.randomUUID(), role: 'user' as const, content},
			])
			return
		}
		// Optimistically add user message
		setMessages(prev => [
			...prev,
			{id: crypto.randomUUID(), role: 'user' as const, content},
		])
		wsRef.current.send(JSON.stringify({type: 'prompt', content}))
	}, [])

	const sendInput = useCallback((content: string) => {
		if (wsRef.current?.readyState !== WebSocket.OPEN) return
		wsRef.current.send(
			JSON.stringify({type: 'input', content, sessionId: roomIdRef.current}),
		)
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

	const clearTerminal = useCallback(() => {
		setTerminalLines([])
	}, [])

	const switchModel = useCallback((provider: string, model: string) => {
		if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
		wsRef.current.send(
			JSON.stringify({
				type: 'model_switch',
				provider,
				model,
				sessionId: roomIdRef.current,
			}),
		)
	}, [])

	return {
		messages,
		wsStatus,
		isStreaming,
		currentModel,
		opencodeUrl,
		sendMessage,
		sendInput,
		stop,
		clearHistory,
		switchModel,
		terminalLines,
		clearTerminal,
	}
}

// ── Main chat ─────────────────────────────────────────────────────────

function ChatInner({roomId: roomIdProp}: {roomId?: string}) {
	const [input, setInput] = useState('')
	const [showDebug, setShowDebug] = useState(false)
	const [showTerminal, setShowTerminal] = useState(false)
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const terminalEndRef = useRef<HTMLDivElement>(null)
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const [bridgeCodeInput, setBridgeCodeInput] = useState('')
	const [bridgeCode, setBridgeCodeState] = useState<string | null>(
		() => roomIdProp ?? getBridgeCode(),
	)
	const roomId = bridgeCode ?? ''

	const {workspaces, activeWorkspaceId, setActiveWorkspace} = useWorkspaces()

	const {
		messages,
		wsStatus,
		isStreaming,
		currentModel,
		opencodeUrl,
		sendMessage,
		sendInput,
		stop,
		clearHistory,
		switchModel,
		terminalLines,
		clearTerminal,
	} = useBridgeAgent(roomId)

	const connected = wsStatus !== 'disconnected'
	const showPairing = !bridgeCode

	// Auto-dismiss pairing when CLI connects
	useEffect(() => {
		if (wsStatus === 'cli_connected' && bridgeCode) {
			setBridgeCode(bridgeCode)
		}
	}, [wsStatus, bridgeCode])

	const handlePair = useCallback(() => {
		const code = bridgeCodeInput.trim().toUpperCase()
		if (!code) return
		setBridgeCode(code)
		setBridgeCodeState(code)
	}, [bridgeCodeInput])

	const handleUnpair = useCallback(() => {
		localStorage.removeItem(BRIDGE_CODE_KEY)
		setBridgeCodeState(null)
		setBridgeCodeInput('')
	}, [])

	const handleStop = useCallback(() => {
		stop()
	}, [stop])

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({behavior: 'smooth'})
	}, [messages])

	useEffect(() => {
		if (showTerminal) {
			terminalEndRef.current?.scrollIntoView({behavior: 'smooth'})
		}
	}, [terminalLines, showTerminal])

	useEffect(() => {
		if (!isStreaming && textareaRef.current) {
			textareaRef.current.focus()
		}
	}, [isStreaming])

	const send = useCallback(() => {
		const text = input.trim()
		if (!text) return
		setInput('')
		if (isStreaming) {
			sendInput(text)
		} else {
			sendMessage(text)
		}
		if (textareaRef.current) {
			textareaRef.current.style.height = 'auto'
		}
	}, [input, isStreaming, sendMessage, sendInput])

	return (
		<div className="flex flex-col h-full bg-kumo-elevated">
			{/* Header */}
			<header className="px-5 py-4 border-b bg-kumo-base border-kumo-line">
				<div className="flex items-center justify-between max-w-3xl mx-auto">
					<div className="flex items-center gap-3">
						<h1 className="text-lg font-semibold text-kumo-default">
							<span className="mr-2">⛅</span>Agent Chat
						</h1>
						<Badge variant="secondary">
							<ChatCircleDotsIcon size={12} weight="bold" className="mr-1" />
							{wsStatus === 'cli_connected' ? 'CLI Connected' : 'Bridge'}
						</Badge>
						{bridgeCode && (
							<Badge variant="outline">
								<LinkIcon size={10} className="mr-1" />
								{bridgeCode}
							</Badge>
						)}
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
											: wsStatus === 'reconnecting'
												? 'text-yellow-400 animate-pulse'
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
											: wsStatus === 'reconnecting'
												? 'Reconnecting...'
												: 'Disconnected'}
							</Text>
						</div>
						{wsStatus === 'cli_connected' && (
							<>
								<ModelSelector
									currentProvider={currentModel?.provider}
									currentModel={currentModel?.model}
									onSwitch={switchModel}
								/>
								<ModelSettingsModal
									currentProvider={currentModel?.provider}
									currentModel={currentModel?.model}
									onSwitch={switchModel}
								/>
							</>
						)}
						{workspaces.length > 0 && (
							<select
								value={activeWorkspaceId ?? ''}
								onChange={e => setActiveWorkspace(e.target.value)}
								className="text-xs rounded-md border border-kumo-line bg-kumo-base text-kumo-default px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-kumo-ring"
								aria-label="Active workspace"
							>
								{workspaces.map(w => (
									<option key={w.id} value={w.id}>
										{w.name}
									</option>
								))}
							</select>
						)}
						<div className="flex items-center gap-1.5">
							<BugIcon size={14} className="text-kumo-inactive" />
							<Switch
								checked={showDebug}
								onCheckedChange={setShowDebug}
								size="sm"
								aria-label="Toggle debug mode"
							/>
						</div>
						<Button
							variant={showTerminal ? 'primary' : 'secondary'}
							shape="square"
							icon={<TerminalWindowIcon size={16} />}
							onClick={() => setShowTerminal(v => !v)}
							aria-label="Toggle terminal"
							title="Toggle agent logs terminal"
						/>
						<ThemeToggle />
						{bridgeCode && (
							<Button
								variant="secondary"
								icon={<LinkBreakIcon size={16} />}
								onClick={handleUnpair}
								title="Unpair – enter a new bridge code"
							>
								Unpair
							</Button>
						)}
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

			{showPairing ? (
				<div className="flex items-center justify-center flex-1">
					<div className="w-full max-w-md px-5 mx-auto space-y-6 text-center">
						<div className="space-y-2">
							<LinkIcon size={48} className="mx-auto text-kumo-inactive" />
							<Text size="lg">Pair with CLI</Text>
							<Text size="sm" variant="secondary">
								Run{' '}
								<code className="bg-kumo-control px-1.5 py-0.5 rounded text-kumo-default">
									happy-vibecode connect {'<agent>'}
								</code>{' '}
								to get a bridge code, then enter it below.
							</Text>
						</div>
						<div className="flex gap-2">
							<input
								type="text"
								value={bridgeCodeInput}
								onChange={e => setBridgeCodeInput(e.target.value.toUpperCase())}
								onKeyDown={e => {
									if (e.key === 'Enter') handlePair()
								}}
								placeholder="Enter 8-char code"
								maxLength={8}
								className="flex-1 px-4 py-2.5 rounded-xl border border-kumo-line bg-kumo-base text-kumo-default text-center text-lg tracking-widest font-mono uppercase placeholder:tracking-normal placeholder:font-sans placeholder:text-sm placeholder:normal-case focus:outline-none focus:ring-2 focus:ring-kumo-ring"
							/>
							<Button
								variant="primary"
								onClick={handlePair}
								disabled={bridgeCodeInput.trim().length < 4}
							>
								Pair
							</Button>
						</div>
					</div>
				</div>
			) : (
				<>
					{/* opencode debug banner */}
					{showDebug && opencodeUrl && (
						<div className="bg-kumo-control border-b border-kumo-line px-5 py-1.5 flex items-center gap-2 text-xs text-kumo-subtle font-mono">
							<span className="text-green-500">●</span>
							<span>opencode serve:</span>
							<span className="text-kumo-default">{opencodeUrl}</span>
						</div>
					)}
					{/* Messages */}
					<div className="flex-1 min-h-0 overflow-y-auto">
						<div className="max-w-3xl px-5 py-6 mx-auto space-y-5">
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
														className="p-3 sd-theme rounded-2xl rounded-bl-md"
														controls={false}
														isAnimating={isLastAssistant && isStreaming}
													>
														{message.content}
													</Streamdown>
													{message.model && (
														<div className="px-3 pb-2">
															<Badge variant="outline">{message.model}</Badge>
														</div>
													)}
												</div>
											</div>
										)}
									</div>
								)
							})}

							<div ref={messagesEndRef} />
						</div>
					</div>

					{showTerminal && (
						<div
							className="border-t border-kumo-line bg-zinc-950"
							style={{height: '200px', flexShrink: 0}}
						>
							<div className="flex items-center justify-between px-3 py-1 border-b border-zinc-800">
								<span className="font-mono text-xs text-zinc-400">
									Agent Logs
								</span>
								<button
									type="button"
									onClick={clearTerminal}
									className="text-xs text-zinc-400 hover:text-zinc-200 px-2 py-0.5 rounded"
								>
									Clear
								</button>
							</div>
							<pre
								className="p-3 overflow-y-auto font-mono text-xs whitespace-pre-wrap text-zinc-300 wrap-break-word"
								style={{height: 'calc(200px - 33px)'}}
							>
								{terminalLines.length === 0 ? (
									<span className="text-zinc-600">No agent logs yet...</span>
								) : (
									terminalLines.join('\n')
								)}
								<div ref={terminalEndRef} />
							</pre>
						</div>
					)}
					{/* Input */}
					<div className="mb-1 border-t border-kumo-line bg-kumo-base">
						<form
							onSubmit={e => {
								e.preventDefault()
								send()
							}}
							className="max-w-3xl px-5 py-4 mx-auto"
						>
							<div className="flex items-end gap-3 p-3 transition-shadow border shadow-sm rounded-xl border-kumo-line bg-kumo-base focus-within:ring-2 focus-within:ring-kumo-ring focus-within:border-transparent">
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
									placeholder={
										isStreaming ? 'Reply to agent...' : 'Send a message...'
									}
									disabled={!connected}
									rows={1}
									className="flex-1 ring-0! focus:ring-0! shadow-none! bg-transparent! outline-none! resize-none max-h-40"
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
				</>
			)}
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
