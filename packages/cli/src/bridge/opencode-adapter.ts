import {debug} from '../utils/log.js'
import {spawn} from 'child_process'

export interface PromptResponse {
	text: string
	sessionId: string
	error?: string
}

// JSON event types from `opencode run --format json`
interface JsonEvent {
	type: string
	timestamp?: number
	sessionID?: string
	part?: {
		id?: string
		messageID?: string
		sessionID?: string
		type?: string
		text?: string
		[key: string]: unknown
	}
}

// Strip ANSI escape codes from text
/* eslint-disable no-control-regex */
function stripAnsi(text: string): string {
	return text
		.replace(/\x1b\[[0-9;]*[mGKHFABCDST]/g, '')
		.replace(/\x1b\].*?\x07/g, '')
}
/* eslint-enable no-control-regex */

// Resolve the command to run opencode cross-platform
function getOpencodeCommand(): {cmd: string; baseArgs: string[]} {
	if (process.platform === 'win32') {
		return {cmd: process.env.COMSPEC || 'cmd.exe', baseArgs: ['/c', 'opencode']}
	}
	return {cmd: 'opencode', baseArgs: []}
}

export class OpencodeBridgeAdapter {
	private baseUrl: string

	constructor(baseUrl: string) {
		this.baseUrl = baseUrl
		debug('OpencodeBridgeAdapter created with baseUrl:', baseUrl)
	}

	async sendPrompt(
		prompt: string,
		model?: {providerID: string; modelID: string},
	): Promise<PromptResponse> {
		let fullText = ''
		let error: string | undefined
		await new Promise<void>(resolve => {
			this.sendPromptStreaming(
				prompt,
				model,
				chunk => {
					fullText += chunk
				},
				() => resolve(),
				err => {
					error = err
					resolve()
				},
			)
		})
		return {text: fullText, sessionId: '', error}
	}

	async sendPromptStreaming(
		prompt: string,
		model: {providerID: string; modelID: string} | undefined,
		onChunk: (text: string) => void,
		onDone: () => void,
		onError: (err: string) => void,
	): Promise<{sessionId: string; abort: () => Promise<void>}> {
		const sessionId = Math.random().toString(36).slice(2)
		let doneCalled = false

		const callDone = () => {
			if (doneCalled) return
			doneCalled = true
			onDone()
		}

		const {cmd, baseArgs} = getOpencodeCommand()

		// Build args: opencode run --format json [--model provider/model] <prompt>
		const runArgs = [...baseArgs, 'run', '--format', 'json']
		if (model) {
			runArgs.push('--model', `${model.providerID}/${model.modelID}`)
		}
		runArgs.push(prompt)

		debug('Spawning opencode:', cmd, runArgs.join(' '))

		const child = spawn(cmd, runArgs, {
			cwd: process.cwd(),
			env: {...process.env},
			stdio: ['ignore', 'pipe', 'pipe'],
		})

		// Track cumulative text per part ID to compute deltas
		const partTextLen = new Map<string, number>()
		let stdoutBuf = ''

		child.stdout.on('data', (chunk: Buffer) => {
			stdoutBuf += chunk.toString('utf8')
			// Process complete newline-delimited JSON lines
			const lines = stdoutBuf.split('\n')
			stdoutBuf = lines.pop() ?? ''

			for (const line of lines) {
				const trimmed = line.trim()
				if (!trimmed) continue

				// Skip non-JSON lines (ANSI, MCP startup noise)
				if (!trimmed.startsWith('{')) {
					debug('opencode non-json stdout:', trimmed)
					continue
				}

				try {
					const event = JSON.parse(trimmed) as JsonEvent
					if (event.type === 'text' && event.part?.type === 'text') {
						const partId = event.part.id ?? 'default'
						const fullText = (event.part.text as string) ?? ''
						const prev = partTextLen.get(partId) ?? 0
						const delta = fullText.slice(prev)
						if (delta) {
							partTextLen.set(partId, fullText.length)
							onChunk(delta)
						}
					} else if (event.type === 'error') {
						const msg =
							(event.part as {error?: string})?.error ?? 'Unknown error'
						onError(msg)
					}
				} catch {
					debug('opencode invalid json line:', trimmed.slice(0, 80))
				}
			}
		})

		child.stderr.on('data', (chunk: Buffer) => {
			debug('opencode stderr:', stripAnsi(chunk.toString('utf8')).trim())
		})

		child.on('error', (err: Error) => {
			debug('opencode spawn error:', err.message)
			onError(`Failed to spawn opencode: ${err.message}`)
			callDone()
		})

		child.on('close', (code: number | null) => {
			// Flush any remaining buffered line
			if (stdoutBuf.trim().startsWith('{')) {
				try {
					const event = JSON.parse(stdoutBuf.trim()) as JsonEvent
					if (event.type === 'text' && event.part?.type === 'text') {
						const partId = event.part.id ?? 'default'
						const fullText = (event.part.text as string) ?? ''
						const prev = partTextLen.get(partId) ?? 0
						const delta = fullText.slice(prev)
						if (delta) onChunk(delta)
					}
				} catch {
					// ignore
				}
			}
			debug('opencode run exited with code:', code)
			callDone()
		})

		const abort = async () => {
			if (!doneCalled) {
				child.kill('SIGTERM')
				callDone()
			}
		}

		return {sessionId, abort}
	}

	async abortSession(_sessionId: string): Promise<void> {
		debug('abortSession called (subprocess manages its own lifecycle)')
	}

	async cleanup(): Promise<void> {
		debug('OpencodeBridgeAdapter cleaned up')
	}
}
