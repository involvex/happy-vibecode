import type {wsMessageSchema} from '@happy-vibecode/shared'
import {DurableObject} from 'cloudflare:workers'
import type {z} from 'zod'

type WsMessage = z.infer<typeof wsMessageSchema>

// ── Constants ──────────────────────────────────────────────────────────────────
const KEEPALIVE_INTERVAL_MS = 30_000
const KEEPALIVE_TIMEOUT_MS = 90_000
const BACKPRESSURE_LIMIT_BYTES = 64 * 1024 // 64 KB
const SCROLLBACK_BUFFER_BYTES = 256 * 1024 // 256 KB
const DROP_WARN_THRESHOLD_1 = 100
const DROP_WARN_THRESHOLD_N = 1000

interface BridgeSession {
	ws: WebSocket
	type: 'cli' | 'web' | 'mobile'
	mode: 'chat' | 'pty'
	userId: string
	sessionId?: string
	workspace?: string
	model?: string
	lastPingAt: number
}

/**
 * BridgeAgent Durable Object
 *
 * Manages real-time relay between:
 * - CLI bridge (the local agent running on user's machine)
 * - Web/Mobile clients (sending prompts, receiving responses)
 *
 * Room ID = userId ensures each user has their own isolated bridge.
 * Messages are persisted to D1 for history.
 */
export class BridgeAgent extends DurableObject<Env> {
	private sessions = new Map<WebSocket, BridgeSession>()
	// Scrollback buffer: stores last N bytes of agent output for reconnecting clients
	private scrollbackBuffer = ''
	private scrollbackSeq = 0
	// Liveness tracking for keepalive
	private aliveMap = new Map<WebSocket, boolean>()
	// Drop counters per client (slow-client backpressure)
	private dropCounters = new Map<WebSocket, number>()
	// Accumulate streamed response chunks keyed by sessionId so we can persist
	// the full response text once the CLI sends the final done:true message
	private responseAccumulator = new Map<string, string>()

	override async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url)
		const upgradeHeader = request.headers.get('Upgrade')

		// HTTP status check endpoint
		if (!upgradeHeader || upgradeHeader !== 'websocket') {
			if (url.pathname.endsWith('/status')) {
				return Response.json({cliConnected: !!this.findCli()})
			}
			return new Response('Expected WebSocket', {status: 426})
		}

		const clientType = (url.searchParams.get('type') ?? 'web') as
			| 'cli'
			| 'web'
			| 'mobile'
		const clientMode = (url.searchParams.get('mode') ?? 'chat') as
			| 'chat'
			| 'pty'
		// Read userId from authenticated header set by the worker
		// Falls back to query param for backward compatibility
		const userId =
			request.headers.get('X-Authenticated-UserId') ??
			url.searchParams.get('userId') ??
			'anonymous'

		const {0: client, 1: server} = new WebSocketPair()
		server.accept()

		this.sessions.set(server, {
			ws: server,
			type: clientType,
			mode: clientMode,
			userId,
			lastPingAt: Date.now(),
		})
		this.aliveMap.set(server, true)
		this.dropCounters.set(server, 0)

		server.addEventListener('message', event => {
			this.handleMessage(server, event.data as string)
		})

		server.addEventListener('close', () => {
			this.sessions.delete(server)
			this.aliveMap.delete(server)
			this.dropCounters.delete(server)
			if (clientType === 'cli') {
				this.broadcast(
					JSON.stringify({type: 'status', status: 'cli_disconnected'}),
					'cli',
				)
			}
		})

		server.addEventListener('error', () => {
			this.sessions.delete(server)
			this.aliveMap.delete(server)
			this.dropCounters.delete(server)
		})

		if (clientType === 'cli') {
			this.broadcast(
				JSON.stringify({type: 'status', status: 'cli_connected'}),
				'cli',
			)
		}

		// Send current CLI status to newly connected web/mobile clients
		if (clientType === 'web' || clientType === 'mobile') {
			const cliOnline = !!this.findCli()
			server.send(
				JSON.stringify({
					type: 'status',
					status: cliOnline ? 'cli_connected' : 'cli_disconnected',
				}),
			)
			// Send any buffered scrollback so the client can catch up
			if (this.scrollbackBuffer.length > 0) {
				server.send(
					JSON.stringify({
						type: 'scrollback',
						seq: this.scrollbackSeq,
						data: this.scrollbackBuffer,
					}),
				)
			}
		}

		// Ensure keepalive alarm is scheduled
		await this.ctx.storage.setAlarm(Date.now() + KEEPALIVE_INTERVAL_MS)

		return new Response(null, {status: 101, webSocket: client})
	}

	private handleMessage(sender: WebSocket, data: string) {
		let msg: WsMessage
		try {
			msg = JSON.parse(data) as WsMessage
		} catch {
			return
		}

		const senderSession = this.sessions.get(sender)
		if (!senderSession) return

		// Keepalive ping/pong handling
		if (msg.type === 'ping') {
			senderSession.lastPingAt = Date.now()
			sender.send(JSON.stringify({type: 'pong'}))
			return
		}
		if (msg.type === 'pong') {
			this.aliveMap.set(sender, true)
			senderSession.lastPingAt = Date.now()
			return
		}

		// Reconnect: client requesting scrollback delta or full buffer
		if ((msg as {type: string; lastSeq?: number}).type === 'sync') {
			const lastSeq = (msg as {type: string; lastSeq?: number}).lastSeq ?? -1
			if (lastSeq === -1 || lastSeq >= this.scrollbackSeq) {
				sender.send(
					JSON.stringify({
						type: 'scrollback',
						seq: this.scrollbackSeq,
						data: this.scrollbackBuffer,
					}),
				)
			} else {
				const delta = this.scrollbackBuffer.slice(
					-(this.scrollbackSeq - lastSeq),
				)
				sender.send(
					JSON.stringify({
						type: 'scrollback',
						seq: this.scrollbackSeq,
						data: delta,
					}),
				)
			}
			return
		}

		// CLI → web/mobile: relay responses, errors, and status updates
		if (senderSession.type === 'cli') {
			if (msg.type === 'workspace') {
				senderSession.workspace = msg.workspacePath
				this.broadcast(data, 'cli')
				return
			}
			if (msg.type === 'model') {
				senderSession.model = msg.model
				this.broadcast(data, 'cli')
				return
			}
			if (msg.type === 'model_switch_ack') {
				if (msg.success) {
					senderSession.model = msg.model
				}
				this.broadcast(data, 'cli')
				return
			}
			if (msg.type === 'agent_logs' || msg.type === 'agent_status_update') {
				// Append agent output to scrollback buffer
				if (msg.type === 'agent_logs' && msg.content) {
					this.appendScrollback(msg.content)
				}
				this.broadcast(data, 'cli')
				if (msg.type === 'agent_status_update') {
					this.notifyStatusChange(
						senderSession.userId,
						msg.sessionId,
						msg.status,
						msg.details,
					).catch(() => {})
				}
				return
			}
			// Relay thinking blocks to web/mobile clients (visible in disclosure section)
			if ((msg as {type: string}).type === 'agent_thinking') {
				this.broadcast(data, 'cli')
				return
			}
			// PTY relay: forward raw terminal output to all web/mobile clients
			if (
				msg.type === 'pty_start' ||
				msg.type === 'pty_data' ||
				msg.type === 'pty_exit'
			) {
				// For pty_data, append to scrollback so reconnecting clients see recent output
				if (msg.type === 'pty_data') {
					this.appendScrollback(msg.data)
				}
				this.broadcast(data, 'cli')
				return
			}
			if (
				msg.type === 'response' ||
				msg.type === 'error' ||
				msg.type === 'status'
			) {
				this.broadcast(data, 'cli')
				if (msg.type === 'response' && !msg.done && msg.content) {
					// Accumulate streamed chunks; the final done:true carries empty content
					const key = msg.sessionId ?? senderSession.userId
					this.responseAccumulator.set(
						key,
						(this.responseAccumulator.get(key) ?? '') + msg.content,
					)
				}
				if (msg.type === 'response' && msg.done) {
					const key = msg.sessionId ?? senderSession.userId
					const fullContent = this.responseAccumulator.get(key) ?? ''
					this.responseAccumulator.delete(key)
					this.persistMessage(
						msg.sessionId ?? senderSession.userId,
						senderSession.userId,
						'assistant',
						fullContent,
						senderSession.model,
					).catch(() => {})
					this.notifyAgentCompleted(
						senderSession.userId,
						msg.sessionId ?? senderSession.userId,
					).catch(() => {})
				}
				if (msg.type === 'error') {
					this.notifyAgentError(
						senderSession.userId,
						msg.sessionId ?? senderSession.userId,
						msg.message,
					).catch(() => {})
					this.handleProviderFallback(senderSession.userId, msg).catch(() => {})
				}
			}
			return
		}

		// web/mobile → CLI: relay prompts; persist user message
		if (
			(senderSession.type === 'web' || senderSession.type === 'mobile') &&
			msg.type === 'prompt'
		) {
			const cliSession = this.findCli()
			if (cliSession) {
				try {
					// Inject sessionId so CLI can identify the prompt origin
					const payload = JSON.stringify({
						...msg,
						sessionId: msg.sessionId ?? senderSession.userId,
					})
					cliSession.ws.send(payload)
					this.persistMessage(
						msg.sessionId ?? senderSession.userId,
						senderSession.userId,
						'user',
						msg.content,
					).catch(() => {})
				} catch {
					sender.send(
						JSON.stringify({
							type: 'error',
							message: 'CLI connection lost. Please reconnect.',
						}),
					)
					this.sessions.delete(cliSession.ws)
				}
			} else {
				sender.send(
					JSON.stringify({
						type: 'error',
						message: 'No CLI connected to this bridge',
					}),
				)
			}
			return
		}

		// web/mobile → CLI: relay stdin input for interactive agents
		if (
			(senderSession.type === 'web' || senderSession.type === 'mobile') &&
			msg.type === 'input'
		) {
			const cliSession = this.findCli()
			if (cliSession) {
				try {
					cliSession.ws.send(data)
				} catch {
					sender.send(
						JSON.stringify({
							type: 'error',
							message: 'CLI connection lost. Please reconnect.',
						}),
					)
					this.sessions.delete(cliSession.ws)
				}
			}
			return
		}

		// web/mobile → CLI: PTY keyboard input and resize events
		if (
			(senderSession.type === 'web' || senderSession.type === 'mobile') &&
			(msg.type === 'pty_input' || msg.type === 'pty_resize')
		) {
			const cliSession = this.findCli()
			if (cliSession) {
				try {
					cliSession.ws.send(data)
				} catch {
					sender.send(
						JSON.stringify({
							type: 'error',
							message: 'CLI connection lost. Please reconnect.',
						}),
					)
					this.sessions.delete(cliSession.ws)
				}
			}
			return
		}

		// web/mobile → CLI: agent control messages
		if (
			(senderSession.type === 'web' || senderSession.type === 'mobile') &&
			(msg.type === 'agent_start' ||
				msg.type === 'agent_stop' ||
				msg.type === 'agent_params')
		) {
			const cliSession = this.findCli()
			if (cliSession) {
				try {
					cliSession.ws.send(data)
				} catch {
					sender.send(
						JSON.stringify({
							type: 'error',
							message: 'CLI connection lost. Please reconnect.',
						}),
					)
					this.sessions.delete(cliSession.ws)
				}
			} else {
				sender.send(
					JSON.stringify({
						type: 'error',
						message: 'No CLI connected to this bridge',
					}),
				)
			}
			return
		}

		// web/mobile → CLI: model switch request
		if (
			(senderSession.type === 'web' || senderSession.type === 'mobile') &&
			msg.type === 'model_switch'
		) {
			const cliSession = this.findCli()
			if (cliSession) {
				try {
					cliSession.ws.send(data)
				} catch {
					sender.send(
						JSON.stringify({
							type: 'model_switch_ack',
							provider: msg.provider,
							model: msg.model,
							sessionId: msg.sessionId,
							success: false,
							error: 'CLI connection lost',
						}),
					)
					this.sessions.delete(cliSession.ws)
				}
			} else {
				sender.send(
					JSON.stringify({
						type: 'model_switch_ack',
						provider: msg.provider,
						model: msg.model,
						sessionId: msg.sessionId,
						success: false,
						error: 'No CLI connected to this bridge',
					}),
				)
			}
			return
		}
	}

	private async notifyAgentCompleted(userId: string, sessionId: string) {
		try {
			const session = await this.env.DB.prepare(
				`SELECT metadata FROM agent_sessions WHERE id = ?`,
			)
				.bind(sessionId)
				.first<{metadata: string | null}>()

			let templateName: string | undefined
			if (session?.metadata) {
				try {
					const meta = JSON.parse(session.metadata) as Record<string, unknown>
					templateName = meta.templateName as string | undefined
				} catch {}
			}

			const body = templateName
				? `Agent task from "${templateName}" has completed.`
				: 'Your agent task has completed.'

			await this.sendPushNotification(userId, {
				title: 'Task Complete',
				body,
				data: {
					type: 'agent_completed',
					sessionId,
					...(templateName ? {templateName} : {}),
				},
			})
		} catch {}
	}

	private async notifyAgentError(
		userId: string,
		sessionId: string,
		error: string,
	) {
		try {
			await this.sendPushNotification(userId, {
				title: 'Task Error',
				body: `Agent task encountered an error: ${error.slice(0, 100)}`,
				data: {type: 'agent_error', sessionId},
			})
		} catch {}
	}

	private async notifyStatusChange(
		userId: string,
		sessionId: string,
		status: string,
		details?: string,
	) {
		try {
			if (status === 'requires_input') {
				await this.sendPushNotification(userId, {
					title: 'Input Required',
					body: details ?? 'Your agent task requires your input.',
					data: {type: 'agent_requires_input', sessionId},
				})
			}
		} catch {}
	}

	private async sendPushNotification(
		userId: string,
		payload: {title: string; body: string; data?: Record<string, string>},
	) {
		try {
			const devices = await this.env.DB.prepare(
				`SELECT token, platform FROM device_tokens WHERE user_id = ?`,
			)
				.bind(userId)
				.all<{token: string; platform: string}>()

			if (!devices.results || devices.results.length === 0) return

			// Check notification preferences
			const prefs = await this.env.DB.prepare(
				`SELECT agent_completed, agent_error, agent_requires_input, quiet_hours_start, quiet_hours_end
				 FROM notification_preferences WHERE user_id = ?`,
			)
				.bind(userId)
				.first<{
					agent_completed: number
					agent_error: number
					agent_requires_input: number
					quiet_hours_start: number | null
					quiet_hours_end: number | null
				}>()

			if (prefs) {
				const type = payload.data?.type
				if (type === 'agent_completed' && !prefs.agent_completed) return
				if (type === 'agent_error' && !prefs.agent_error) return
				if (type === 'agent_requires_input' && !prefs.agent_requires_input)
					return

				if (
					prefs.quiet_hours_start !== null &&
					prefs.quiet_hours_end !== null
				) {
					const hour = new Date().getUTCHours()
					const start = prefs.quiet_hours_start
					const end = prefs.quiet_hours_end
					const inQuietHours =
						start < end
							? hour >= start && hour < end
							: hour >= start || hour < end
					if (inQuietHours) return
				}
			}

			// Import push service dynamically to avoid circular deps
			const fcmKey = (this.env as any).FCM_SERVICE_ACCOUNT_KEY as
				| string
				| undefined
			const _apnsKey = (this.env as any).APNS_AUTH_KEY as string | undefined
			const _apnsKeyId = (this.env as any).APNS_KEY_ID as string | undefined
			const _apnsTeamId = (this.env as any).APNS_TEAM_ID as string | undefined
			void _apnsKey
			void _apnsKeyId
			void _apnsTeamId

			for (const device of devices.results) {
				if (device.platform === 'android' && fcmKey) {
					const {sendFcmNotification} =
						await import('@happy-vibecode/api/services/push-notifications')
					await sendFcmNotification(
						device.token,
						{
							title: payload.title,
							body: payload.body,
							data: payload.data,
							sound: 'default',
						},
						fcmKey,
					)
				}
			}
		} catch {
			// Push notification failure should not break the bridge
		}
	}

	private async persistMessage(
		sessionId: string,
		userId: string,
		role: 'user' | 'assistant',
		content: string,
		model?: string,
	) {
		try {
			const metadata = model ? JSON.stringify({model}) : null
			await this.env.DB.prepare(
				`INSERT INTO message_logs (id, session_id, user_id, role, content, timestamp, metadata)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`,
			)
				.bind(
					crypto.randomUUID(),
					sessionId,
					userId,
					role,
					content,
					Date.now(),
					metadata,
				)
				.run()
		} catch {
			// DB may not be available in local dev
		}
	}

	private async handleProviderFallback(
		userId: string,
		errorMsg: WsMessage & {type: 'error'},
	) {
		try {
			const session = await this.env.DB.prepare(
				`SELECT fallback_chain FROM workspaces WHERE user_id = ? AND is_active = 1 LIMIT 1`,
			)
				.bind(userId)
				.first<{fallback_chain: string | null}>()

			if (!session?.fallback_chain) return

			const chain = JSON.parse(session.fallback_chain) as Array<{
				provider: string
				model: string
			}>
			if (!chain.length) return

			const cliSession = this.findCli()
			if (!cliSession) return

			const currentModel = cliSession.model
			let nextEntry: {provider: string; model: string} | undefined

			if (currentModel) {
				const idx = chain.findIndex(e => e.model === currentModel)
				if (idx >= 0 && idx < chain.length - 1) {
					nextEntry = chain[idx + 1]
				} else if (idx === -1) {
					nextEntry = chain[0]
				}
			} else {
				nextEntry = chain[0]
			}

			if (nextEntry) {
				const switchMsg = JSON.stringify({
					type: 'model_switch',
					provider: nextEntry.provider,
					model: nextEntry.model,
					sessionId: errorMsg.sessionId ?? userId,
				})
				cliSession.ws.send(switchMsg)
			}
		} catch {
			// Fallback chain not configured or parse error
		}
	}

	private broadcast(data: string, excludeType?: 'cli' | 'web' | 'mobile') {
		for (const [ws, session] of this.sessions) {
			if (session.type === excludeType) continue
			// Backpressure: skip slow clients whose send buffer is too full
			if (ws.bufferedAmount > BACKPRESSURE_LIMIT_BYTES) {
				const drops = (this.dropCounters.get(ws) ?? 0) + 1
				this.dropCounters.set(ws, drops)
				if (
					drops === DROP_WARN_THRESHOLD_1 ||
					drops % DROP_WARN_THRESHOLD_N === 0
				) {
					console.warn(
						`[BridgeAgent] slow client dropped ${drops} messages (userId=${session.userId})`,
					)
				}
				continue
			}
			try {
				ws.send(data)
			} catch {
				// Client disconnected — cleanup happens in the 'close' event handler
			}
		}
	}

	/** Keepalive alarm: runs every 30 s to detect dead clients and reschedule. */
	override async alarm(): Promise<void> {
		const now = Date.now()
		for (const [ws, session] of this.sessions) {
			// If no pong received since last ping, close the dead connection
			if (!this.aliveMap.get(ws)) {
				if (now - session.lastPingAt > KEEPALIVE_TIMEOUT_MS) {
					try {
						ws.close(1001, 'keepalive timeout')
					} catch {
						// Already gone
					}
					this.sessions.delete(ws)
					this.aliveMap.delete(ws)
					this.dropCounters.delete(ws)
					continue
				}
			}
			// Mark as not-alive; client must send pong to stay alive
			this.aliveMap.set(ws, false)
			try {
				ws.send(JSON.stringify({type: 'ping'}))
			} catch {
				// Already disconnected
			}
		}
		// Reschedule only if there are still clients connected
		if (this.sessions.size > 0) {
			await this.ctx.storage.setAlarm(Date.now() + KEEPALIVE_INTERVAL_MS)
		}
	}

	/**
	 * Append text to the in-memory scrollback buffer, trimming from the front
	 * when the buffer exceeds SCROLLBACK_BUFFER_BYTES.
	 */
	private appendScrollback(text: string): void {
		this.scrollbackBuffer += text
		this.scrollbackSeq += text.length
		// Trim excess bytes from the front (approximate — no multi-byte split risk
		// because we trim whole characters via string length, not byte indexing)
		if (this.scrollbackBuffer.length > SCROLLBACK_BUFFER_BYTES) {
			this.scrollbackBuffer = this.scrollbackBuffer.slice(
				this.scrollbackBuffer.length - SCROLLBACK_BUFFER_BYTES,
			)
		}
	}

	private findCli(): BridgeSession | undefined {
		for (const [, session] of this.sessions) {
			if (session.type === 'cli') return session
		}
		return undefined
	}

	async isCliConnected(): Promise<boolean> {
		return !!this.findCli()
	}
}
