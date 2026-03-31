import type {
	AgentDefinition,
	AgentsConfig,
	WorkspaceConfig,
} from '../types/llm-provider.js'
import {
	ensureOpencodeServer,
	type OpencodeServerInfo,
} from '../utils/opencode-server.js'
import {requireConfig, writeConfig, generateBridgeCode} from '../config.js'
import {OpencodeBridgeAdapter} from '../bridge/opencode-adapter.js'
import {DEFAULT_AGENTS} from '../utils/agents-config.js'
import {debug, debugTime} from '../utils/log.js'
import {existsSync, readFileSync} from 'fs'
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

interface WsInput {
	type: 'input'
	content: string
	sessionId: string
}

type IncomingMsg =
	| WsPrompt
	| WsPing
	| WsWorkspace
	| WsModel
	| WsInput
	| {type: string}

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
			provider: 'custom' as const,
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

/**
 * Map an agent definition and optional model override to an opencode provider/model pair.
 *
 * modelOverride formats:
 *   "anthropic/claude-opus-4-5"  → {providerID: "anthropic", modelID: "claude-opus-4-5"}
 *   "gemini-2.0-flash"           → {providerID: <from agent>, modelID: "gemini-2.0-flash"}
 *   undefined                    → {providerID: <from agent>, modelID: "default"}
 */
function agentToOpencodeModel(
	agent: AgentDefinition,
	modelOverride?: string,
): {providerID: string; modelID: string} | undefined {
	// Explicit "providerID/modelID" format takes full precedence
	if (modelOverride?.includes('/')) {
		const slash = modelOverride.indexOf('/')
		return {
			providerID: modelOverride.slice(0, slash),
			modelID: modelOverride.slice(slash + 1),
		}
	}

	// Map agent provider slug → opencode provider ID
	const providerMap: Record<string, string> = {
		gemini: 'google',
		claude: 'anthropic',
		codex: 'openai',
		// opencode-ai agent defaults to anthropic (opencode's default provider)
		'opencode-ai': 'anthropic',
		copilot: 'github',
		kilo: 'anthropic',
		cline: 'anthropic',
	}
	const providerID = providerMap[agent.provider] ?? agent.provider
	if (!providerID || providerID === 'custom') return undefined

	// Plain model name (no slash) → use as modelID, infer providerID from agent
	const modelID = modelOverride ?? 'default'
	return {providerID, modelID}
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
		'Model to use — plain name (e.g. claude-opus-4-5) or provider/model (e.g. anthropic/claude-opus-4-5)',
	)
	.option(
		'-p, --prompt <prompt>',
		'Send a prompt directly and exit (non-interactive mode)',
	)
	.option('-i, --interactive', 'Force interactive mode')
	.option(
		'-s, --server <url>',
		'opencode serve URL (auto-starts if not running)',
		'http://127.0.0.1:4096',
	)
	.option('-v, --verbose', 'Verbose output')
	.action(async (agentId: string, opts) => {
		const config = requireConfig()
		const {serverUrl, apiToken} = config
		let userId = config.userId
		const verbose: boolean = opts.verbose ?? false

		debug('Config loaded from ~/.happy/config.json')
		debug('Server URL:', serverUrl)
		debug('Agent requested:', agentId)

		// Verify token and resolve userId if not in config
		if (serverUrl && apiToken) {
			try {
				const done = debugTime('POST /api/auth/verify')
				const res = await fetch(`${serverUrl}/api/auth/verify`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${apiToken}`,
					},
				})
				done()
				if (res.ok) {
					const data = (await res.json()) as {
						valid: boolean
						userId: string
					}
					debug('Token valid:', data.valid, 'userId:', data.userId)
					if (data.valid && data.userId) {
						if (!userId || userId !== data.userId) {
							userId = data.userId
							writeConfig({...config, userId: data.userId})
							if (verbose)
								console.log(`Updated userId in config: ${data.userId}`)
							debug('userId updated in config:', data.userId)
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
				debug('Token verification failed:', (err as Error).message)
			}
		}

		if (!userId) {
			console.error(
				'✗ Could not determine user ID. Please run: happy-vibecode login',
			)
			process.exit(1)
		}

		// Determine room ID: explicit --room > saved bridge code > generate new > userId fallback
		let roomId: string
		if (opts.room) {
			roomId = opts.room
			debug('Room ID from --room flag:', roomId)
		} else if (config.bridgeCode) {
			roomId = config.bridgeCode
			debug('Room ID from stored bridge code:', roomId)
		} else {
			const bridgeCode = generateBridgeCode()
			writeConfig({...config, bridgeCode})
			roomId = bridgeCode
			debug('Generated new bridge code:', bridgeCode)
		}

		if (!opts.room) {
			console.log(`Bridge code: ${roomId}`)
			console.log('  Enter this code in the web or mobile app to pair.')
			console.log(`  Or open: ${serverUrl}/chat?room=${roomId}\n`)
		}

		// Resolve the agent definition (for display name and model mapping)
		const agents = await loadAgents(serverUrl, apiToken)
		const agent: AgentDefinition = findAgent(agents, agentId) ?? {
			id: agentId,
			name: agentId,
			provider: 'custom' as const,
			command: agentId,
			args: [],
			promptFlag: '-p',
			description: `Custom agent: ${agentId}`,
		}
		debug('Agent:', agent.name, 'provider:', agent.provider)

		// Ensure opencode serve is running
		const opencodeUrl = opts.server
		const opencodePort = parseInt(new URL(opencodeUrl).port || '4096', 10)

		const serverSpinner = ora('Connecting to opencode server...').start()
		let opencodeServer: OpencodeServerInfo
		try {
			opencodeServer = await ensureOpencodeServer(opencodePort)
			serverSpinner.succeed(`opencode server ready at ${opencodeServer.url}`)
		} catch (err) {
			serverSpinner.fail(
				`Failed to start opencode server: ${(err as Error).message}`,
			)
			console.error(
				'  Make sure opencode is installed: npm install -g opencode-ai',
			)
			process.exit(1)
		}

		// Create the bridge adapter
		const adapter = new OpencodeBridgeAdapter(opencodeServer.url)

		// Resolve model from agent definition + --model flag
		let opencodeModel = agentToOpencodeModel(
			agent,
			opts.model as string | undefined,
		)
		if (verbose && opencodeModel) {
			console.log(
				`  Model: ${opencodeModel.providerID}/${opencodeModel.modelID}`,
			)
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

		console.log(`Connecting agent "${agent.name}" to bridge room: ${roomId}`)
		if (workspace) {
			console.log(`  Workspace: ${workspace}`)
		}

		const wsUrl = serverUrl
			.replace(/^https?/, m => (m === 'https' ? 'wss' : 'ws'))
			.concat(`/agents/BridgeAgent/${roomId}?type=cli`)

		if (verbose) console.log(`WebSocket URL: ${wsUrl}`)
		debug('WebSocket URL:', wsUrl)
		debug('Workspace:', workspace ?? '(none)')
		debug('opencode URL:', opencodeServer.url)

		const log = (...args: unknown[]) => {
			if (verbose) console.log(...args)
		}

		let reconnectAttempts = 0
		const MAX_RECONNECT = 3
		let intentionalClose = false
		let keepaliveTimer: ReturnType<typeof setInterval> | null = null

		function connectWs(): WebSocket {
			const socket = new WebSocket(wsUrl, {
				headers: {Authorization: `Bearer ${apiToken}`},
			})

			socket.on('open', () => {
				reconnectAttempts = 0
				console.log(`✓ Bridge connected. Waiting for prompts...`)
				console.log('  Press Ctrl+C to disconnect.\n')
				debug('WS open — sent cli_connected status')

				socket.send(JSON.stringify({type: 'status', status: 'cli_connected'}))

				// Relay opencode server URL to web/mobile for optional direct connection
				socket.send(
					JSON.stringify({type: 'opencode_url', url: opencodeServer.url}),
				)
				debug('Sent opencode_url relay:', opencodeServer.url)

				// Keepalive: send ping every 30s to prevent Cloudflare idle timeout
				if (keepaliveTimer) clearInterval(keepaliveTimer)
				keepaliveTimer = setInterval(() => {
					if (socket.readyState === WebSocket.OPEN) {
						socket.send(JSON.stringify({type: 'ping'}))
						debug('Keepalive ping sent')
					}
				}, 30_000)
				debug('Keepalive ping scheduled (30s interval)')

				if (workspace) {
					socket.send(
						JSON.stringify({type: 'workspace', workspacePath: workspace}),
					)
				}

				if (opts.prompt) {
					log('Running in single prompt mode')
					const sessionId = `single-${Date.now()}`
					console.log(`→ Prompt: ${opts.prompt.slice(0, 80)}...`)

					socket.send(
						JSON.stringify({
							type: 'status',
							status: 'agent_thinking',
							sessionId,
						}),
					)

					adapter
						.sendPrompt(opts.prompt, opencodeModel)
						.then(result => {
							if (result.error) {
								console.error(`\n✗ Agent error: ${result.error}`)
								if (socket.readyState === WebSocket.OPEN) {
									socket.send(
										JSON.stringify({
											type: 'error',
											message: result.error,
											sessionId,
										}),
									)
								}
							} else {
								process.stdout.write(result.text + '\n')
								if (socket.readyState === WebSocket.OPEN) {
									socket.send(
										JSON.stringify({
											type: 'response',
											content: result.text,
											sessionId,
											done: false,
										}),
									)
									socket.send(
										JSON.stringify({
											type: 'response',
											content: '',
											sessionId,
											done: true,
										}),
									)
								}
							}
							intentionalClose = true
							socket.close()
							process.exit(result.error ? 1 : 0)
						})
						.catch(err => {
							const msg = `Failed to send prompt: ${(err as Error).message}`
							console.error(`\n✗ Agent error: ${msg}`)
							if (socket.readyState === WebSocket.OPEN) {
								socket.send(
									JSON.stringify({
										type: 'error',
										message: msg,
										sessionId,
									}),
								)
							}
							intentionalClose = true
							socket.close()
							process.exit(1)
						})
				}
			})

			if (!opts.prompt) {
				let agentRunning = false
				let currentAbort: (() => Promise<void>) | null = null

				socket.on('message', data => {
					let msg: IncomingMsg
					try {
						msg = JSON.parse(data.toString()) as IncomingMsg
					} catch {
						log('Received non-JSON message:', data.toString().slice(0, 120))
						return
					}

					log('Received:', msg.type)

					if (msg.type === 'ping') {
						socket.send(JSON.stringify({type: 'pong'}))
						return
					}

					if (msg.type === 'stop') {
						if (currentAbort) {
							currentAbort()
							currentAbort = null
						}
						agentRunning = false
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
						opencodeModel = agentToOpencodeModel(agent, wsMsg.model)
						log('Model updated:', wsMsg.model, '→', opencodeModel)
						return
					}

					if (msg.type !== 'prompt') return

					const {content, sessionId} = msg as WsPrompt
					console.log(`\n→ Prompt [${sessionId}]: ${content.slice(0, 80)}...`)

					if (agentRunning) {
						console.log('  (ignored — agent already running)')
						if (socket.readyState === WebSocket.OPEN) {
							socket.send(
								JSON.stringify({
									type: 'error',
									message:
										'Agent is already running. Please wait or press Stop first.',
									sessionId,
								}),
							)
						}
						return
					}

					agentRunning = true
					socket.send(
						JSON.stringify({
							type: 'status',
							status: 'agent_thinking',
							sessionId,
						}),
					)

					adapter
						.sendPromptStreaming(
							content,
							opencodeModel,
							chunk => {
								process.stdout.write(chunk)
								const response: WsResponse = {
									type: 'response',
									content: chunk,
									sessionId,
									done: false,
								}
								if (socket.readyState === WebSocket.OPEN) {
									socket.send(JSON.stringify(response))
								}
							},
							() => {
								agentRunning = false
								currentAbort = null
								console.log(`\n← Done [${sessionId}]`)
								const response: WsResponse = {
									type: 'response',
									content: '',
									sessionId,
									done: true,
								}
								if (socket.readyState === WebSocket.OPEN) {
									socket.send(JSON.stringify(response))
								}
							},
							err => {
								agentRunning = false
								currentAbort = null
								console.error(`\n✗ Agent error [${sessionId}]: ${err}`)
								if (socket.readyState === WebSocket.OPEN) {
									socket.send(
										JSON.stringify({
											type: 'error',
											message: err,
											sessionId,
										}),
									)
								}
							},
						)
						.then(result => {
							currentAbort = result.abort
						})
						.catch(err => {
							agentRunning = false
							const msg = `Failed to start agent: ${(err as Error).message}`
							console.error(`\n✗ ${msg}`)
							if (socket.readyState === WebSocket.OPEN) {
								socket.send(
									JSON.stringify({type: 'error', message: msg, sessionId}),
								)
							}
						})
				})

				socket.on('close', () => {
					if (currentAbort) {
						currentAbort()
						currentAbort = null
					}
					agentRunning = false
				})
			}

			socket.on('error', err => {
				console.error(`WebSocket error: ${err.message}`)
				debug('WS error:', err.message, err.stack)
			})

			socket.on('close', (code, reason) => {
				debug('WS close — code:', code, 'reason:', reason.toString())

				if (keepaliveTimer) {
					clearInterval(keepaliveTimer)
					keepaliveTimer = null
				}

				if (intentionalClose) {
					console.log(`\nBridge disconnected (${code} ${reason.toString()})`)
					process.exit(0)
				}

				if (reconnectAttempts < MAX_RECONNECT) {
					const delay = Math.min(1000 * 2 ** reconnectAttempts, 10_000)
					reconnectAttempts++
					console.log(
						`\nBridge disconnected (${code} ${reason.toString()}). Reconnecting in ${delay / 1000}s... (attempt ${reconnectAttempts}/${MAX_RECONNECT})`,
					)
					debug('Reconnecting in', delay, 'ms')
					setTimeout(() => connectWs(), delay)
				} else {
					console.log(
						`\nBridge disconnected (${code} ${reason.toString()}). Max retries reached.`,
					)
					process.exit(1)
				}
			})

			return socket
		}

		process.on('SIGINT', () => {
			console.log('\nDisconnecting...')
			intentionalClose = true
			adapter.cleanup()
			process.exit(0)
		})

		connectWs()
	})
