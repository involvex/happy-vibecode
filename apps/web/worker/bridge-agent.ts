import type {wsMessageSchema} from '@happy-vibecode/shared'
import {DurableObject} from 'cloudflare:workers'
import type {z} from 'zod'

type WsMessage = z.infer<typeof wsMessageSchema>

interface BridgeSession {
	ws: WebSocket
	type: 'cli' | 'web' | 'mobile'
	userId: string
	sessionId?: string
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
		const userId = url.searchParams.get('userId') ?? 'anonymous'

		const {0: client, 1: server} = new WebSocketPair()
		server.accept()

		this.sessions.set(server, {ws: server, type: clientType, userId})

		server.addEventListener('message', event => {
			this.handleMessage(server, event.data as string)
		})

		server.addEventListener('close', () => {
			this.sessions.delete(server)
			if (clientType === 'cli') {
				this.broadcast(
					JSON.stringify({type: 'status', status: 'cli_disconnected'}),
					'cli',
				)
			}
		})

		server.addEventListener('error', () => {
			this.sessions.delete(server)
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
		}

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

		if (msg.type === 'ping') {
			sender.send(JSON.stringify({type: 'pong'}))
			return
		}

		// CLI → web/mobile: relay responses, errors, and status updates
		if (senderSession.type === 'cli') {
			if (
				msg.type === 'response' ||
				msg.type === 'error' ||
				msg.type === 'status'
			) {
				this.broadcast(data, 'cli')
				if (msg.type === 'response' && msg.done) {
					this.persistMessage(
						msg.sessionId ?? senderSession.userId,
						senderSession.userId,
						'assistant',
						msg.content,
					).catch(() => {})
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
				cliSession.ws.send(data)
				this.persistMessage(
					msg.sessionId ?? senderSession.userId,
					senderSession.userId,
					'user',
					msg.content,
				).catch(() => {})
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
	}

	private async persistMessage(
		sessionId: string,
		userId: string,
		role: 'user' | 'assistant',
		content: string,
	) {
		try {
			await this.env.DB.prepare(
				`INSERT INTO message_logs (id, session_id, user_id, role, content, created_at)
				 VALUES (?, ?, ?, ?, ?, ?)`,
			)
				.bind(
					crypto.randomUUID(),
					sessionId,
					userId,
					role,
					content,
					new Date().toISOString(),
				)
				.run()
		} catch {
			// DB may not be available in local dev
		}
	}

	private broadcast(data: string, excludeType?: 'cli' | 'web' | 'mobile') {
		for (const [, session] of this.sessions) {
			if (session.type !== excludeType) {
				try {
					session.ws.send(data)
				} catch {
					// Client disconnected
				}
			}
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
