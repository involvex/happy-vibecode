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
	UploadSimpleIcon,
	RobotIcon,
	PlusIcon,
	PencilIcon,
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
			<CircleIcon
				size={16}
				weight="duotone"
			/>
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
	const [ptyMode, setPtyMode] = useState(false)
	const [ptyOutput, setPtyOutput] = useState('')
	const ptyOutputRef = useRef('')
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
					data?: string
					cols?: number
					rows?: number
					exitCode?: number
					signal?: string
				}

				if (msg.type === 'pty_start') {
					ptyOutputRef.current = ''
					setPtyOutput('')
					setPtyMode(true)
					return
				} else if (msg.type === 'pty_data' && msg.data) {
					ptyOutputRef.current += msg.data
					setPtyOutput(ptyOutputRef.current)
					return
				} else if (msg.type === 'pty_exit') {
					ptyOutputRef.current += `\r\n[Process exited${msg.exitCode != null ? ` with code ${msg.exitCode}` : ''}]\r\n`
					setPtyOutput(ptyOutputRef.current)
					return
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

	const sendPtyInput = useCallback((data: string) => {
		if (wsRef.current?.readyState !== WebSocket.OPEN) return
		wsRef.current.send(JSON.stringify({type: 'pty_input', data}))
	}, [])

	const sendPtyResize = useCallback((cols: number, rows: number) => {
		if (wsRef.current?.readyState !== WebSocket.OPEN) return
		wsRef.current.send(JSON.stringify({type: 'pty_resize', cols, rows}))
	}, [])

	const clearPty = useCallback(() => {
		ptyOutputRef.current = ''
		setPtyOutput('')
		setPtyMode(false)
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
		ptyMode,
		ptyOutput,
		sendPtyInput,
		sendPtyResize,
		clearPty,
	}
}

// ── PTY Terminal ──────────────────────────────────────────────────────

function stripAnsi(raw: string): string {
	/* eslint-disable no-control-regex */
	return raw
		.replace(/\u001b\[[0-9;]*[mGKHFJABCDsurh?l]/g, '')
		.replace(/\u001b[()][012B]/g, '')
	/* eslint-enable no-control-regex */
}

function PtyTerminal({
	output,
	onKey,
	onClear,
}: {
	output: string
	onKey: (data: string) => void
	onClear: () => void
}) {
	const preRef = useRef<HTMLPreElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		preRef.current?.scrollTo({
			top: preRef.current.scrollHeight,
			behavior: 'smooth',
		})
	}, [output])

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLDivElement>) => {
			let data = ''
			if (e.key === 'Enter') {
				data = '\r'
			} else if (e.key === 'Backspace') {
				data = '\x7f'
			} else if (e.key === 'Tab') {
				e.preventDefault()
				data = '\t'
			} else if (e.key === 'Escape') {
				data = '\x1b'
			} else if (e.key === 'ArrowUp') {
				e.preventDefault()
				data = '\x1b[A'
			} else if (e.key === 'ArrowDown') {
				e.preventDefault()
				data = '\x1b[B'
			} else if (e.key === 'ArrowRight') {
				data = '\x1b[C'
			} else if (e.key === 'ArrowLeft') {
				data = '\x1b[D'
			} else if (e.key === 'Home') {
				data = '\x1b[H'
			} else if (e.key === 'End') {
				data = '\x1b[F'
			} else if (e.key === 'Delete') {
				data = '\x1b[3~'
			} else if (e.ctrlKey && e.key.length === 1) {
				e.preventDefault()
				data = String.fromCharCode(e.key.toLowerCase().charCodeAt(0) - 96)
			} else if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) {
				data = e.key
			}
			if (data) onKey(data)
		},
		[onKey],
	)

	return (
		<div
			ref={containerRef}
			tabIndex={0}
			onKeyDown={handleKeyDown}
			className="flex flex-col flex-1 min-h-0 font-mono outline-none bg-zinc-950 focus:ring-2 focus:ring-inset focus:ring-green-700 cursor-text"
			onClick={() => containerRef.current?.focus()}
		>
			<div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800 shrink-0 bg-zinc-900">
				<span className="text-xs text-zinc-400 flex items-center gap-1.5">
					<TerminalWindowIcon size={12} />
					<span>PTY Terminal</span>
					<span className="text-zinc-600">(click to focus, then type)</span>
				</span>
				<button
					type="button"
					onClick={onClear}
					className="text-xs text-zinc-400 hover:text-zinc-200 px-2 py-0.5 rounded hover:bg-zinc-800 transition-colors"
				>
					Exit terminal
				</button>
			</div>
			<pre
				ref={preRef}
				className="flex-1 p-3 overflow-y-auto text-sm leading-snug text-green-400 break-all whitespace-pre-wrap"
			>
				{output ? (
					stripAnsi(output)
				) : (
					<span className="text-zinc-600">Waiting for terminal output...</span>
				)}
			</pre>
		</div>
	)
}

// ── Custom Agents Modal ───────────────────────────────────────────────

interface CustomAgentRow {
	id: string
	name: string
	command: string
	args: string[]
	promptFlag: string | null
	workspaceFlag: string | null
	modelFlag: string | null
	description: string | null
	userId: string | null
}

interface CustomAgentFormData {
	name: string
	command: string
	args: string
	promptFlag: string
	workspaceFlag: string
	modelFlag: string
	description: string
}

function CustomAgentForm({
	initial,
	onSubmit,
	onCancel,
}: {
	initial?: CustomAgentRow
	onSubmit: (data: CustomAgentFormData) => Promise<void>
	onCancel: () => void
}) {
	const [form, setForm] = useState<CustomAgentFormData>({
		name: initial?.name ?? '',
		command: initial?.command ?? '',
		args: initial?.args.join(' ') ?? '',
		promptFlag: initial?.promptFlag ?? '',
		workspaceFlag: initial?.workspaceFlag ?? '',
		modelFlag: initial?.modelFlag ?? '',
		description: initial?.description ?? '',
	})
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setLoading(true)
		setError('')
		try {
			await onSubmit(form)
		} catch (err) {
			setError((err as Error).message)
		} finally {
			setLoading(false)
		}
	}

	const inputCls =
		'w-full px-3 py-1.5 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default text-sm placeholder-kumo-inactive focus:outline-none focus:ring-2 focus:ring-kumo-ring'

	const field = (
		label: string,
		key: keyof CustomAgentFormData,
		placeholder?: string,
	) => (
		<div>
			<label className="block text-xs font-medium text-kumo-secondary mb-1">
				{label}
			</label>
			<input
				type="text"
				value={form[key]}
				onChange={e => setForm(f => ({...f, [key]: e.target.value}))}
				placeholder={placeholder}
				className={inputCls}
			/>
		</div>
	)

	return (
		<form
			onSubmit={handleSubmit}
			className="space-y-3"
		>
			{field('Name *', 'name', 'e.g. Claude Code Evolved')}
			{field('Command *', 'command', 'e.g. claude-evolved')}
			{field(
				'Args (space-separated)',
				'args',
				'e.g. --dangerously-skip-permissions',
			)}
			{field('Prompt Flag', 'promptFlag', 'e.g. -p')}
			{field('Workspace Flag', 'workspaceFlag', 'e.g. --dir')}
			{field('Model Flag', 'modelFlag', 'e.g. --model')}
			<div>
				<label className="block text-xs font-medium text-kumo-secondary mb-1">
					Description
				</label>
				<textarea
					value={form.description}
					onChange={e => setForm(f => ({...f, description: e.target.value}))}
					rows={2}
					className="w-full px-3 py-1.5 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default text-sm placeholder-kumo-inactive focus:outline-none focus:ring-2 focus:ring-kumo-ring resize-none"
				/>
			</div>
			{error && <p className="text-xs text-red-500">{error}</p>}
			<div className="flex gap-2 justify-end pt-1">
				<Button
					variant="secondary"
					size="sm"
					type="button"
					onClick={onCancel}
				>
					Cancel
				</Button>
				<Button
					variant="primary"
					size="sm"
					type="submit"
					disabled={loading}
				>
					{loading ? 'Saving…' : initial ? 'Update' : 'Create'}
				</Button>
			</div>
		</form>
	)
}

function CustomAgentsModal({onClose}: {onClose: () => void}) {
	const [agents, setAgents] = useState<CustomAgentRow[]>([])
	const [loading, setLoading] = useState(true)
	const [editing, setEditing] = useState<CustomAgentRow | null>(null)
	const [creating, setCreating] = useState(false)
	const [error, setError] = useState('')

	const apiToken = localStorage.getItem('happy-api-token')
	const authHeaders = {
		Authorization: `Bearer ${apiToken ?? ''}`,
		'Content-Type': 'application/json',
	}

	const fetchAgents = async () => {
		setLoading(true)
		setError('')
		try {
			const res = await fetch('/api/agents', {
				headers: {Authorization: `Bearer ${apiToken ?? ''}`},
			})
			if (!res.ok) throw new Error('Failed to load agents')
			const data = (await res.json()) as {agents: CustomAgentRow[]}
			setAgents(data.agents)
		} catch (err) {
			setError((err as Error).message)
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		fetchAgents()
	}, [])

	const parseForm = (data: CustomAgentFormData) => ({
		name: data.name,
		command: data.command,
		args: data.args
			.split(' ')
			.map(s => s.trim())
			.filter(Boolean),
		promptFlag: data.promptFlag || undefined,
		workspaceFlag: data.workspaceFlag || undefined,
		modelFlag: data.modelFlag || undefined,
		description: data.description || undefined,
	})

	const handleCreate = async (data: CustomAgentFormData) => {
		const res = await fetch('/api/agents', {
			method: 'POST',
			headers: authHeaders,
			body: JSON.stringify(parseForm(data)),
		})
		if (!res.ok) {
			const err = (await res.json()) as {error?: string}
			throw new Error(err.error ?? 'Failed to create agent')
		}
		setCreating(false)
		fetchAgents()
	}

	const handleUpdate = async (data: CustomAgentFormData) => {
		if (!editing) return
		const res = await fetch(`/api/agents/${editing.id}`, {
			method: 'PUT',
			headers: authHeaders,
			body: JSON.stringify(parseForm(data)),
		})
		if (!res.ok) {
			const err = (await res.json()) as {error?: string}
			throw new Error(err.error ?? 'Failed to update agent')
		}
		setEditing(null)
		fetchAgents()
	}

	const handleDelete = async (id: string) => {
		if (!confirm('Delete this agent?')) return
		const res = await fetch(`/api/agents/${id}`, {
			method: 'DELETE',
			headers: authHeaders,
		})
		if (!res.ok) {
			const err = (await res.json()) as {error?: string}
			alert(err.error ?? 'Failed to delete agent')
			return
		}
		fetchAgents()
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="bg-kumo-base border border-kumo-line rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
				<div className="flex items-center justify-between px-5 py-4 border-b border-kumo-line">
					<h2 className="text-sm font-semibold text-kumo-default flex items-center gap-2">
						<RobotIcon size={16} />
						Custom CLI Agents
					</h2>
					<button
						onClick={onClose}
						className="text-kumo-inactive hover:text-kumo-default text-lg leading-none"
					>
						×
					</button>
				</div>

				<div className="flex-1 overflow-y-auto p-5 space-y-4">
					{loading && (
						<p className="text-xs text-kumo-secondary text-center py-4">
							Loading…
						</p>
					)}
					{error && <p className="text-xs text-red-500">{error}</p>}

					{!loading && !creating && !editing && (
						<>
							<p className="text-xs text-kumo-secondary">
								Your custom agents are added to the agent list in the CLI.
								System agents (shared) are shown read-only.
							</p>
							<div className="space-y-2">
								{agents.map(a => (
									<div
										key={a.id}
										className="flex items-center justify-between rounded-lg border border-kumo-line bg-kumo-elevated px-3 py-2 gap-2"
									>
										<div className="min-w-0 flex-1">
											<p className="text-sm font-medium text-kumo-default truncate">
												{a.name}
											</p>
											<p className="text-xs text-kumo-secondary truncate">
												<code className="font-mono">{a.command}</code>
												{a.workspaceFlag && (
													<span className="ml-2 text-kumo-inactive">
														{a.workspaceFlag} &lt;dir&gt;
													</span>
												)}
											</p>
										</div>
										{a.userId !== null ? (
											<div className="flex gap-1 shrink-0">
												<button
													onClick={() => setEditing(a)}
													className="p-1 rounded text-kumo-secondary hover:text-kumo-default hover:bg-kumo-control"
													title="Edit"
												>
													<PencilIcon size={14} />
												</button>
												<button
													onClick={() => handleDelete(a.id)}
													className="p-1 rounded text-kumo-secondary hover:text-red-500 hover:bg-kumo-control"
													title="Delete"
												>
													<TrashIcon size={14} />
												</button>
											</div>
										) : (
											<span className="text-xs text-kumo-inactive shrink-0">
												system
											</span>
										)}
									</div>
								))}
								{agents.length === 0 && (
									<p className="text-xs text-kumo-inactive text-center py-4">
										No agents yet. Add one below.
									</p>
								)}
							</div>
							<Button
								variant="secondary"
								size="sm"
								icon={<PlusIcon size={14} />}
								onClick={() => setCreating(true)}
								className="w-full"
							>
								Add Agent
							</Button>
						</>
					)}

					{creating && (
						<>
							<h3 className="text-xs font-semibold text-kumo-default">
								New Agent
							</h3>
							<CustomAgentForm
								onSubmit={handleCreate}
								onCancel={() => setCreating(false)}
							/>
						</>
					)}

					{editing && (
						<>
							<h3 className="text-xs font-semibold text-kumo-default">
								Edit Agent
							</h3>
							<CustomAgentForm
								initial={editing}
								onSubmit={handleUpdate}
								onCancel={() => setEditing(null)}
							/>
						</>
					)}
				</div>
			</div>
		</div>
	)
}

// ── Main chat ─────────────────────────────────────────────────────────

function ChatInner({roomId: roomIdProp}: {roomId?: string}) {
	const [input, setInput] = useState('')
	const [showDebug, setShowDebug] = useState(false)
	const [showTerminal, setShowTerminal] = useState(false)
	const [showAgents, setShowAgents] = useState(false)
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const terminalEndRef = useRef<HTMLDivElement>(null)
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)
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
		ptyMode,
		ptyOutput,
		sendPtyInput,
		clearPty,
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
		<>
			<div className="flex flex-col h-full bg-kumo-elevated">
				{/* Header */}
				<header className="px-5 py-4 border-b bg-kumo-base border-kumo-line">
					<div className="flex items-center justify-between max-w-3xl mx-auto">
						<div className="flex items-center gap-3">
							<h1 className="text-lg font-semibold text-kumo-default">
								<span className="mr-2">⛅</span>Agent Chat
							</h1>
							<Badge variant="secondary">
								<ChatCircleDotsIcon
									size={12}
									weight="bold"
									className="mr-1"
								/>
								{wsStatus === 'cli_connected' ? 'CLI Connected' : 'Bridge'}
							</Badge>
							{bridgeCode && (
								<Badge variant="outline">
									<LinkIcon
										size={10}
										className="mr-1"
									/>
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
								<Text
									size="xs"
									variant="secondary"
								>
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
										<option
											key={w.id}
											value={w.id}
										>
											{w.name}
										</option>
									))}
								</select>
							)}
							<div className="flex items-center gap-1.5">
								<BugIcon
									size={14}
									className="text-kumo-inactive"
								/>
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
							<Button
								variant="secondary"
								shape="square"
								icon={<RobotIcon size={16} />}
								onClick={() => setShowAgents(v => !v)}
								aria-label="Manage custom agents"
								title="Manage custom CLI agents"
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
								<LinkIcon
									size={48}
									className="mx-auto text-kumo-inactive"
								/>
								<Text size="lg">Pair with CLI</Text>
								<Text
									size="sm"
									variant="secondary"
								>
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
									onChange={e =>
										setBridgeCodeInput(e.target.value.toUpperCase())
									}
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
						{ptyMode ? (
							<PtyTerminal
								output={ptyOutput}
								onKey={sendPtyInput}
								onClear={clearPty}
							/>
						) : (
							<>
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
												message.role === 'assistant' &&
												index === messages.length - 1

											return (
												<div
													key={message.id}
													className="space-y-2"
												>
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
																		<Badge variant="outline">
																			{message.model}
																		</Badge>
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
												<span className="text-zinc-600">
													No agent logs yet...
												</span>
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
											<input
												ref={fileInputRef}
												type="file"
												accept=".md,.txt,.ts,.tsx,.js,.jsx,.py,.json,.yaml,.yml"
												className="hidden"
												onChange={e => {
													const file = e.target.files?.[0]
													if (!file) return
													const reader = new FileReader()
													reader.onload = ev => {
														const content = ev.target?.result as string
														setInput(prev =>
															prev
																? `${prev}\n\n---\n**${file.name}:**\n\`\`\`\n${content}\n\`\`\``
																: `**${file.name}:**\n\`\`\`\n${content}\n\`\`\``,
														)
													}
													reader.readAsText(file)
													e.target.value = ''
												}}
											/>
											<Button
												type="button"
												variant="ghost"
												shape="square"
												size="sm"
												aria-label="Attach file"
												icon={<UploadSimpleIcon size={16} />}
												onClick={() => fileInputRef.current?.click()}
												className="mb-0.5 text-kumo-muted hover:text-kumo-default"
												disabled={!connected}
											/>
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
													isStreaming
														? 'Reply to agent...'
														: 'Send a message...'
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
					</>
				)}
			</div>
			{showAgents && <CustomAgentsModal onClose={() => setShowAgents(false)} />}
		</>
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
