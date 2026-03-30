import {
	createOpencodeClient,
	type OpencodeClient,
	type Session,
	type TextPart,
	type Part,
} from '@opencode-ai/sdk'
import {debug} from '../utils/log.js'

export interface PromptResponse {
	text: string
	sessionId: string
	error?: string
}

export class OpencodeBridgeAdapter {
	private client: OpencodeClient
	private sessions: Set<string> = new Set()

	constructor(baseUrl: string) {
		this.client = createOpencodeClient({baseUrl})
		debug('OpencodeBridgeAdapter created with baseUrl:', baseUrl)
	}

	async sendPrompt(
		prompt: string,
		model?: {providerID: string; modelID: string},
	): Promise<PromptResponse> {
		// Create a session for this prompt
		const sessionRes = await this.client.session.create({
			body: {title: prompt.slice(0, 80)},
		})
		if (!sessionRes.data) {
			return {text: '', sessionId: '', error: 'Failed to create session'}
		}
		const session: Session = sessionRes.data
		this.sessions.add(session.id)
		debug('Created opencode session:', session.id)

		// Send the prompt
		const promptBody: Record<string, unknown> = {
			parts: [{type: 'text', text: prompt}],
		}
		if (model) {
			promptBody.model = model
		}

		const messageRes = await this.client.session.prompt({
			path: {id: session.id},
			body: promptBody as {
				parts: Array<{type: 'text'; text: string}>
				model?: {providerID: string; modelID: string}
			},
		})

		if (messageRes.error) {
			const errMsg =
				typeof messageRes.error === 'object' && 'message' in messageRes.error
					? (messageRes.error as {message: string}).message
					: JSON.stringify(messageRes.error)
			return {text: '', sessionId: session.id, error: errMsg}
		}

		if (!messageRes.data) {
			return {text: '', sessionId: session.id, error: 'No response data'}
		}

		// Extract text from response parts
		const text = this.extractTextFromParts(messageRes.data.parts)
		return {text, sessionId: session.id}
	}

	async sendPromptStreaming(
		prompt: string,
		model: {providerID: string; modelID: string} | undefined,
		onChunk: (text: string) => void,
		onDone: () => void,
		onError: (err: string) => void,
	): Promise<{sessionId: string; abort: () => Promise<void>}> {
		// Create a session for this prompt
		let session: Session
		try {
			const sessionRes = await this.client.session.create({
				body: {title: prompt.slice(0, 80)},
			})
			if (!sessionRes.data) {
				onError('Failed to create session')
				onDone()
				return {sessionId: '', abort: async () => {}}
			}
			session = sessionRes.data
			this.sessions.add(session.id)
			debug('Created opencode session for streaming:', session.id)
		} catch (err) {
			onError(`Failed to create session: ${(err as Error).message}`)
			onDone()
			return {sessionId: '', abort: async () => {}}
		}

		const sessionId = session.id
		let lastTextLength = 0

		// Subscribe to events for streaming updates
		// The SDK manages the SSE connection lifecycle internally.
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const _eventStream = this.client.event.subscribe({
			onSseEvent: event => {
				const data = event.data as {
					type: string
					properties: Record<string, unknown>
				}
				if (!data?.type) return

				// Filter for events related to our session
				if (data.type === 'message.part.updated') {
					const part = data.properties.part as Part | undefined
					if (!part) return
					if (part.sessionID !== sessionId) return
					if (part.type === 'text') {
						const textPart = part as TextPart
						if (textPart.text && textPart.text.length > lastTextLength) {
							const newChunk = textPart.text.slice(lastTextLength)
							lastTextLength = textPart.text.length
							if (newChunk) onChunk(newChunk)
						}
					}
				} else if (data.type === 'message.updated') {
					const info = data.properties.info as
						| {sessionID?: string; role?: string; error?: {message?: string}}
						| undefined
					if (info?.sessionID === sessionId && info.role === 'assistant') {
						if (info.error?.message) {
							onError(info.error.message)
						}
					}
				} else if (data.type === 'session.idle') {
					const eventSessionID = (data.properties as {sessionID?: string})
						.sessionID
					if (eventSessionID === sessionId) {
						onDone()
					}
				}
			},
			onSseError: err => {
				debug('SSE error:', err)
			},
		})

		// Fire the prompt asynchronously
		try {
			const promptBody: Record<string, unknown> = {
				parts: [{type: 'text', text: prompt}],
			}
			if (model) {
				promptBody.model = model
			}

			await this.client.session.promptAsync({
				path: {id: sessionId},
				body: promptBody as {
					parts: Array<{type: 'text'; text: string}>
					model?: {providerID: string; modelID: string}
				},
			})
			debug('Prompt sent async to session:', sessionId)
		} catch (err) {
			onError(`Failed to send prompt: ${(err as Error).message}`)
			onDone()
		}

		const abort = async () => {
			try {
				await this.client.session.abort({path: {id: sessionId}})
			} catch {
				// ignore abort errors
			}
		}

		return {sessionId, abort}
	}

	async abortSession(sessionId: string): Promise<void> {
		try {
			await this.client.session.abort({path: {id: sessionId}})
			debug('Aborted opencode session:', sessionId)
		} catch (err) {
			debug('Failed to abort session:', (err as Error).message)
		}
	}

	async cleanup(): Promise<void> {
		// Nothing to clean up at the session level — opencode server
		// manages session lifecycle. We just drop our references.
		this.sessions.clear()
		debug('OpencodeBridgeAdapter cleaned up')
	}

	private extractTextFromParts(parts: Part[]): string {
		return parts
			.filter((p): p is TextPart => p.type === 'text' && !p.ignored)
			.map(p => p.text)
			.join('\n')
	}
}
