import type {
	AgentDefinition,
	AgentsConfig,
	WorkspaceConfig,
} from '../types/llm-provider.js'
import {DEFAULT_AGENTS} from '../utils/agents-config.js'
import {requireConfig, writeConfig} from '../config.js'
import {existsSync, readFileSync} from 'fs'
import {spawn} from 'child_process'
import {Command} from 'commander'
import WebSocket from 'ws'
import {homedir} from 'os'
import {join} from 'path'
import ora from 'ora'

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

interface WsWorkspace {
	type: 'workspace'
	workspaceId?: string
	workspacePath?: string
}

interface WsModel {
	type: 'model'
	model: string
}

type IncomingMsg = WsPrompt | WsPing | WsWorkspace | WsModel | {type: string}

const AGENTS_FILE = join(homedir(), '.happy', 'agents.json')

function loadLocalConfig(): AgentsConfig {
	if (!existsSync(AGENTS_FILE)) {
		return {agents: [], workspaces: []}
	}
	try {
		const cfg = JSON.parse(readFileSync(AGENTS_FILE, 'utf8')) as AgentsConfig
		return cfg
	} catch {
		return {agents: [], workspaces: []}
	}
}

async function fetchAgentsFromApi(
	serverUrl: string,
	apiToken: string,
): Promise<AgentDefinition[]> {
	try {
		const url = `${serverUrl}/api/agents`
		const res = await fetch(url, {
			headers: {Authorization: `Bearer ${apiToken}`},
		})
		if (!res.ok) return []
		const data = (await res.json()) as {
			agents: Array<{
				id: string
				name: string
				command: string
				args: string[]
				promptFlag: string | null
				modelFlag: string | null
				description: string | null
			}>
		}
		return data.agents.map(a => ({
			id: a.id,
			name: a.name,
			command: a.command,
			args: a.args,
			promptFlag: a.promptFlag ?? undefined,
			modelFlag: a.modelFlag ?? undefined,
			description: a.description ?? '',
		}))
	} catch {
		return []
	}
}

async function loadAgents(
	serverUrl?: string,
	apiToken?: string,
): Promise<AgentDefinition[]> {
	if (serverUrl && apiToken) {
		const apiAgents = await fetchAgentsFromApi(serverUrl, apiToken)
		if (apiAgents.length > 0) return apiAgents
	}
	const local = loadLocalConfig()
	if (local.agents.length > 0) return local.agents
	return DEFAULT_AGENTS.agents
}

function loadWorkspaces(): WorkspaceConfig[] {
	return loadLocalConfig().workspaces ?? []
}

function findWorkspace(id: string): WorkspaceConfig | undefined {
	return loadWorkspaces().find(w => w.id === id)
}

function findAgent(
	agents: AgentDefinition[],
	id: string,
): AgentDefinition | undefined {
	return agents.find(a => a.id === id || a.command === id)
}

async function checkCommandExists(command: string): Promise<boolean> {
	const {execSync} = await import('child_process')
	const isWindows = process.platform === 'win32'
	const cmd = isWindows ? `where ${command}` : `which ${command}`
	try {
		execSync(cmd, {stdio: 'ignore'})
		return true
	} catch {
		return false
	}
}

function getInstallHint(agentId: string): string {
	const hints: Record<string, string> = {
		gemini: 'npm install -g @google/gemini-cli or npm install -g gemini-core',
		claude:
			'npm install -g @anthropic/claude-cli or see https://www.anthropic.com/claude-code',
		codex: 'npm install -g openai-codex or see https://openai.com/codex',
		'opencode-ai': 'npm install -g opencode-ai or see https://opencode.ai',
		copilot:
			'npm install -g @anthropic/claude-code (copilot is part of Claude Code)',
	}
	return hints[agentId] ?? ''
}

async function runAgent(
	agent: AgentDefinition,
	prompt: string,
	workspace: string | undefined,
	model: string | undefined,
	onChunk: (chunk: string) => void,
	onDone: () => void,
	onError: (err: string) => void,
): Promise<void> {
	const args: string[] = []

	if (model && agent.modelFlag) {
		args.push(agent.modelFlag, model)
	}

	const promptFlag = agent.promptFlag || '-p'
	const quotedPrompt = prompt.replace(/"/g, '\\"')
	args.push(promptFlag, `"${quotedPrompt}"`)

	const fullArgs = [...agent.args, ...args]
	const agentCmd = [agent.command, ...fullArgs].join(' ')

	const cmdStr = workspace ? `cd "${workspace}" && ${agentCmd}` : agentCmd

	const spinner = ora(`Running ${agent.name}...`).start()

	const proc = spawn(cmdStr, {
		stdio: ['ignore', 'pipe', 'pipe'],
		shell: true,
	})

	proc.stdout.setEncoding('utf8')
	proc.stdout.on('data', (chunk: string) => {
		spinner.stop()
		onChunk(chunk)
	})

	proc.stderr.setEncoding('utf8')
	proc.stderr.on('data', (chunk: string) => {
		spinner.stop()
		onChunk(chunk)
	})

	proc.on('close', code => {
		spinner.stop()
		if (code !== 0 && code !== null) {
			onError(`Agent exited with code ${code}`)
		} else {
			onDone()
		}
	})

	proc.on('error', err => {
		spinner.stop()
		onError(`Failed to start agent: ${err.message}`)
	})
}

export const connectCommand = new Command('connect')
	.description('Connect a local agent to the bridge')
	.argument(
		'<agent>',
		'Agent ID or command (e.g. gemini, claude, opencode-ai, copilot)',
	)
	.option(
		'-r, --room <roomId>',
		'Bridge room ID (defaults to your user ID from config)',
	)
	.option('-d, --dir <directory>', 'Workspace directory to run agent in')
	.option('-w, --workspace <workspaceId>', 'Workspace ID from config')
	.option(
		'-m, --model <model>',
		'Model to use (provider-specific, e.g., claude-sonnet-4-20250514)',
	)
	.option(
		'-p, --prompt <prompt>',
		'Send a prompt directly and exit (non-interactive mode)',
	)
	.option('-i, --interactive', 'Force interactive mode')
	.option('-v, --verbose', 'Verbose output')
	.action(async (agentId: string, opts) => {
		const config = requireConfig()
		const {serverUrl, apiToken} = config
		let userId = config.userId
		const verbose: boolean = opts.verbose ?? false

		// Verify token and resolve userId if not in config
		if (serverUrl && apiToken) {
			try {
				const res = await fetch(`${serverUrl}/api/auth/verify`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${apiToken}`,
					},
				})
				if (res.ok) {
					const data = (await res.json()) as {
						valid: boolean
						userId: string
					}
					if (data.valid && data.userId) {
						if (!userId || userId !== data.userId) {
							userId = data.userId
							writeConfig({...config, userId: data.userId})
							if (verbose)
								console.log(`Updated userId in config: ${data.userId}`)
						}
					}
				} else {
					console.error(
						'✗ API token is invalid. Please run: happy-vibecode login',
					)
					process.exit(1)
				}
			} catch (err) {
				if (verbose)
					console.log(`Token verification failed: ${(err as Error).message}`)
			}
		}

		if (!userId) {
			console.error(
				'✗ Could not determine user ID. Please run: happy-vibecode login',
			)
			process.exit(1)
		}

		const roomId: string = opts.room ?? userId

		const agents = await loadAgents(serverUrl, apiToken)
		let agent: AgentDefinition | undefined = findAgent(agents, agentId)
		if (!agent) {
			agent = {
				id: agentId,
				name: agentId,
				command: agentId,
				args: [],
				promptFlag: '-p',
				description: `Custom agent: ${agentId}`,
			}
			if (verbose) {
				console.log(`No config found for "${agentId}", using as raw command.`)
			}
		}

		if (!checkCommandExists(agent.command)) {
			const installHint = getInstallHint(agent.id)
			console.error(`✗ Error: "${agent.command}" not found in PATH.`)
			if (installHint) {
				console.error(`  To install: ${installHint}`)
			}
			console.error('  Or add a custom agent in ~/.happy/agents.json')
			process.exit(1)
		}

		let workspace: string | undefined = opts.dir
		if (!workspace && opts.workspace) {
			const ws = findWorkspace(opts.workspace)
			if (ws) {
				workspace = ws.path
			}
		}

		if (workspace && !existsSync(workspace)) {
			console.error(`✗ Error: Workspace directory does not exist: ${workspace}`)
			process.exit(1)
		}

		const model = opts.model || undefined

		console.log(`Connecting agent "${agent.name}" to bridge room: ${roomId}`)
		if (workspace) {
			console.log(`  Workspace: ${workspace}`)
		}
		if (model) {
			console.log(`  Model: ${model}`)
		}

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

			ws.send(JSON.stringify({type: 'status', status: 'cli_connected'}))

			if (workspace) {
				ws.send(JSON.stringify({type: 'workspace', workspacePath: workspace}))
			}
			if (model) {
				ws.send(JSON.stringify({type: 'model', model}))
			}

			if (opts.prompt) {
				log('Running in single prompt mode')
				const sessionId = `single-${Date.now()}`
				console.log(`→ Prompt: ${opts.prompt.slice(0, 80)}...`)

				ws.send(
					JSON.stringify({
						type: 'status',
						status: 'agent_thinking',
						sessionId,
					}),
				)

				runAgent(
					agent!,
					opts.prompt,
					workspace,
					model,
					chunk => {
						process.stdout.write(chunk)
						if (ws.readyState === WebSocket.OPEN) {
							ws.send(
								JSON.stringify({
									type: 'response',
									content: chunk,
									sessionId,
									done: false,
								}),
							)
						}
					},
					() => {
						console.log(`\n← Done`)
						if (ws.readyState === WebSocket.OPEN) {
							ws.send(
								JSON.stringify({
									type: 'response',
									content: '',
									sessionId,
									done: true,
								}),
							)
						}
						ws.close()
						process.exit(0)
					},
					err => {
						console.error(`\n✗ Agent error: ${err}`)
						if (ws.readyState === WebSocket.OPEN) {
							ws.send(JSON.stringify({type: 'error', message: err, sessionId}))
						}
						ws.close()
						process.exit(1)
					},
				)
			}
		})

		if (!opts.prompt) {
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

				if (msg.type === 'workspace') {
					const wsMsg = msg as WsWorkspace
					if (wsMsg.workspacePath) {
						workspace = wsMsg.workspacePath
						log('Workspace updated:', workspace)
					}
					return
				}

				if (msg.type === 'model') {
					const wsMsg = msg as WsModel
					log('Model updated:', wsMsg.model)
					return
				}

				if (msg.type !== 'prompt') return

				const {content, sessionId} = msg as WsPrompt
				console.log(`\n→ Prompt [${sessionId}]: ${content.slice(0, 80)}...`)

				ws.send(
					JSON.stringify({
						type: 'status',
						status: 'agent_thinking',
						sessionId,
					}),
				)

				runAgent(
					agent!,
					content,
					workspace,
					model,
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
		}

		ws.on('error', err => {
			console.error(`WebSocket error: ${err.message}`)
		})

		ws.on('close', (code, reason) => {
			console.log(`\nBridge disconnected (${code} ${reason.toString()})`)
			process.exit(0)
		})

		process.on('SIGINT', () => {
			console.log('\nDisconnecting...')
			ws.close()
			process.exit(0)
		})
	})
