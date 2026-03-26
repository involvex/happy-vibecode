import {existsSync, readFileSync} from 'fs'
import {requireConfig} from '../config.js'
import {spawn} from 'child_process'
import {Command} from 'commander'
import WebSocket from 'ws'
import {homedir} from 'os'
import {join} from 'path'

interface AgentDefinition {
	id: string
	name: string
	command: string
	args: string[]
	description: string
}

interface AgentsConfig {
	agents: AgentDefinition[]
}

interface WsPrompt {
	type: 'prompt'
	content: string
	sessionId: string
}

interface WsResponse {
	type: 'response'
	content: string
	sessionId: string
	done?: boolean
}

interface WsPing {
	type: 'ping'
}

type IncomingMsg = WsPrompt | WsPing | {type: string}

const AGENTS_FILE = join(homedir(), '.happy', 'agents.json')

function loadAgents(): AgentDefinition[] {
	if (!existsSync(AGENTS_FILE)) return []
	try {
		const cfg = JSON.parse(readFileSync(AGENTS_FILE, 'utf8')) as AgentsConfig
		return cfg.agents ?? []
	} catch {
		return []
	}
}

function findAgent(id: string): AgentDefinition | undefined {
	const agents = loadAgents()
	return agents.find(a => a.id === id || a.command === id)
}

/** Run the agent binary with the given prompt and stream its stdout. */
function runAgent(
	agent: AgentDefinition,
	prompt: string,
	onChunk: (chunk: string) => void,
	onDone: () => void,
	onError: (err: string) => void,
): void {
	const args = [...agent.args, prompt]
	const proc = spawn(agent.command, args, {
		stdio: ['ignore', 'pipe', 'pipe'],
		// shell: true is required on Windows where npm CLIs are .cmd wrappers
		shell: process.platform === 'win32',
	})

	proc.stdout.setEncoding('utf8')
	proc.stdout.on('data', (chunk: string) => onChunk(chunk))
	proc.stderr.setEncoding('utf8')
	proc.stderr.on('data', (chunk: string) => {
		// Emit stderr as content too — many CLIs use it for streaming
		onChunk(chunk)
	})
	proc.on('close', code => {
		if (code !== 0 && code !== null) {
			onError(`Agent exited with code ${code}`)
		} else {
			onDone()
		}
	})
	proc.on('error', err => {
		onError(`Failed to start agent: ${err.message}`)
	})
}

export const connectCommand = new Command('connect')
	.description('Connect a local agent to the bridge')
	.argument('<agent>', 'Agent ID or command (e.g. gemini, claude, codex)')
	.option(
		'-r, --room <roomId>',
		'Bridge room ID (defaults to your user ID from config)',
	)
	.option('-v, --verbose', 'Verbose output')
	.action(async (agentId: string, opts) => {
		const config = requireConfig()
		const {serverUrl, apiToken, userId} = config
		const roomId: string = opts.room ?? userId ?? apiToken.slice(0, 8)
		const verbose: boolean = opts.verbose ?? false

		// Resolve agent definition
		let agent: AgentDefinition | undefined = findAgent(agentId)
		if (!agent) {
			// Fall back to treating the argument as a raw command
			agent = {
				id: agentId,
				name: agentId,
				command: agentId,
				args: [],
				description: `Custom agent: ${agentId}`,
			}
			if (verbose)
				console.log(`No config found for "${agentId}", using as raw command.`)
		}

		console.log(`Connecting agent "${agent.name}" to bridge room: ${roomId}`)
		const wsUrl = serverUrl
			.replace(/^https?/, m => (m === 'https' ? 'wss' : 'ws'))
			.concat(`/agents/BridgeAgent/${roomId}?type=cli`)

		if (verbose) console.log(`WebSocket URL: ${wsUrl}`)

		const ws = new WebSocket(wsUrl, {
			headers: {Authorization: `Bearer ${apiToken}`},
		})

		const log = (...args: unknown[]) => {
			if (verbose) console.log(...args)
		}

		ws.on('open', () => {
			console.log(`✓ Bridge connected. Waiting for prompts...`)
			console.log('  Press Ctrl+C to disconnect.\n')
			// Send a status update so web UI knows CLI is connected
			ws.send(JSON.stringify({type: 'status', status: 'cli_connected'}))
		})

		ws.on('message', data => {
			let msg: IncomingMsg
			try {
				msg = JSON.parse(data.toString()) as IncomingMsg
			} catch {
				log('Received non-JSON message:', data.toString().slice(0, 120))
				return
			}

			log('Received:', msg.type)

			if (msg.type === 'ping') {
				ws.send(JSON.stringify({type: 'pong'}))
				return
			}

			if (msg.type !== 'prompt') return

			const {content, sessionId} = msg as WsPrompt
			console.log(`\n→ Prompt [${sessionId}]: ${content.slice(0, 80)}...`)

			// Send a partial status so the UI shows "thinking"
			ws.send(
				JSON.stringify({
					type: 'status',
					status: 'agent_thinking',
					sessionId,
				} satisfies {type: 'status'; status: string; sessionId: string}),
			)

			runAgent(
				agent!,
				content,
				chunk => {
					process.stdout.write(chunk)
					const response: WsResponse = {
						type: 'response',
						content: chunk,
						sessionId,
						done: false,
					}
					if (ws.readyState === WebSocket.OPEN) {
						ws.send(JSON.stringify(response))
					}
				},
				() => {
					console.log(`\n← Done [${sessionId}]`)
					const response: WsResponse = {
						type: 'response',
						content: '',
						sessionId,
						done: true,
					}
					if (ws.readyState === WebSocket.OPEN) {
						ws.send(JSON.stringify(response))
					}
				},
				err => {
					console.error(`\n✗ Agent error [${sessionId}]: ${err}`)
					if (ws.readyState === WebSocket.OPEN) {
						ws.send(JSON.stringify({type: 'error', message: err, sessionId}))
					}
				},
			)
		})

		ws.on('error', err => {
			console.error(`WebSocket error: ${err.message}`)
		})

		ws.on('close', (code, reason) => {
			console.log(`\nBridge disconnected (${code} ${reason.toString()})`)
			process.exit(0)
		})

		// Keep process alive
		process.on('SIGINT', () => {
			console.log('\nDisconnecting...')
			ws.close()
			process.exit(0)
		})
	})
