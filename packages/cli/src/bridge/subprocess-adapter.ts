import {execSync} from 'child_process'
import {debug} from '../utils/log.js'
import {spawn} from 'child_process'
import {existsSync} from 'node:fs'
import crypto from 'node:crypto'
import os from 'node:os'

export interface PromptResponse {
	text: string
	sessionId: string
	error?: string
}

/**
 * Generic subprocess adapter — runs any CLI agent as a child process.
 *
 * Used for all agents except opencode-ai (which has its own HTTP server adapter).
 * Streams raw stdout text back as response chunks; handles model and prompt flags.
 */
export class SubprocessAdapter {
	constructor(
		private readonly command: string,
		private readonly baseArgs: string[] = [],
		private readonly promptFlag?: string,
		private readonly modelFlag?: string,
	) {
		debug(
			'SubprocessAdapter created:',
			command,
			'baseArgs:',
			baseArgs,
			'promptFlag:',
			promptFlag,
			'modelFlag:',
			modelFlag,
		)
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
		const sessionId = crypto.randomUUID()
		let doneCalled = false

		const callDone = () => {
			if (doneCalled) return
			doneCalled = true
			onDone()
		}

		const resolvedCmd = this.resolveCommand(this.command)
		const args = [...this.baseArgs]

		// Inject model flag before the prompt (skip placeholder "default" value)
		if (
			model &&
			this.modelFlag &&
			model.modelID &&
			model.modelID !== 'default'
		) {
			args.push(this.modelFlag, model.modelID)
		}

		// Inject prompt flag + prompt text
		if (this.promptFlag) {
			args.push(this.promptFlag, prompt)
		} else {
			args.push(prompt)
		}

		debug(
			'SubprocessAdapter spawning:',
			resolvedCmd,
			args.map(a => JSON.stringify(a)).join(' '),
		)

		const child = spawn(resolvedCmd, args, {
			cwd: process.cwd(),
			env: {...process.env},
			// shell: true on Windows so .cmd shims resolve correctly
			shell: os.platform() === 'win32',
			stdio: ['ignore', 'pipe', 'pipe'],
		})

		child.stdout.on('data', (chunk: Buffer) => {
			const text = chunk.toString('utf8')
			debug('SubprocessAdapter stdout chunk:', text.slice(0, 80))
			onChunk(text)
		})

		child.stderr.on('data', (chunk: Buffer) => {
			// Pipe stderr to debug only — some agents write progress info to stderr
			debug('SubprocessAdapter stderr:', chunk.toString('utf8').trimEnd())
		})

		child.on('error', (err: Error) => {
			debug('SubprocessAdapter spawn error:', err.message)
			const code = (err as NodeJS.ErrnoException).code
			if (code === 'ENOENT') {
				onError(
					`Command not found: "${this.command}". Make sure it is installed and on your PATH.`,
				)
			} else {
				onError(`Failed to spawn "${this.command}": ${err.message}`)
			}
			callDone()
		})

		child.on('close', (code: number | null) => {
			debug('SubprocessAdapter process exited, code:', code)
			callDone()
		})

		const abort = async () => {
			if (!doneCalled) {
				debug('SubprocessAdapter aborting subprocess')
				child.kill('SIGTERM')
				callDone()
			}
		}

		return {sessionId, abort}
	}

	async abortSession(_sessionId: string): Promise<void> {
		debug(
			'SubprocessAdapter.abortSession: subprocess manages its own lifecycle',
		)
	}

	async cleanup(): Promise<void> {
		debug('SubprocessAdapter cleaned up')
	}

	/**
	 * On Windows, resolve a bare command name to its .cmd shim path so that
	 * child_process.spawn without shell:true can find it in node_modules/.bin.
	 * Falls back to the original name if not found.
	 */
	private resolveCommand(cmd: string): string {
		if (os.platform() !== 'win32') return cmd
		for (const candidate of [`${cmd}.cmd`, cmd]) {
			try {
				const result = execSync(`where.exe "${candidate}" 2>nul`, {
					encoding: 'utf8',
					stdio: ['pipe', 'pipe', 'pipe'],
					timeout: 3000,
				})
					.trim()
					.split('\n')[0]
					?.trim()
				if (result && existsSync(result)) return result
			} catch {
				// try next candidate
			}
		}
		return cmd
	}
}
