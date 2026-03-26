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
 */
export class BridgeAgent extends DurableObject {
	private sessions = new Map<WebSocket, BridgeSession>()

	override async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url)
		const upgradeHeader = request.headers.get('Upgrade')

		if (!upgradeHeader || upgradeHeader !== 'websocket') {
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
			// Notify remaining clients that CLI disconnected
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

		// Notify web/mobile clients that CLI is now connected
		if (clientType === 'cli') {
			this.broadcast(
				JSON.stringify({type: 'status', status: 'cli_connected'}),
				'cli',
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

		// CLI → web/mobile: relay response chunks
		if (
			senderSession.type === 'cli' &&
			(msg.type === 'response' || msg.type === 'error')
		) {
			this.broadcast(data, 'cli')
			return
		}

		// web/mobile → CLI: relay prompts
		if (
			(senderSession.type === 'web' || senderSession.type === 'mobile') &&
			msg.type === 'prompt'
		) {
			const cliSession = this.findCli()
			if (cliSession) {
				cliSession.ws.send(data)
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

	/** Returns true if a CLI is currently connected to this bridge room */
	async isCliConnected(): Promise<boolean> {
		return !!this.findCli()
	}
}
