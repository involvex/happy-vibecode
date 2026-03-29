import type {
	AgentDefinition,
	AgentsConfig,
	WorkspaceConfig,
} from '../types/llm-provider.js'
import {requireConfig, writeConfig, generateBridgeCode} from '../config.js'
import {DEFAULT_AGENTS} from '../utils/agents-config.js'
import {debug, debugTime} from '../utils/log.js'
import {existsSync, readFileSync} from 'fs'
import {spawn} from 'child_process'
import {Command} from 'commander'
import WebSocket from 'ws'
import {homedir} from 'os'
import {join} from 'path'
import ora from 'ora'

// Strip ANSI escape codes so raw terminal output is sent as plain text
const ANSI_RE =
	// eslint-disable-next-line no-control-regex
	/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><~]/g

// Box-drawing and block-element characters used by TUI apps (Kilo, Cline, etc.)
// Unicode ranges: Box Drawing U+2500–U+257F, Block Elements U+2580–U+259F
const BOX_RE = /[\u2500-\u259F]/g

/**
 * Remove TUI decoration artifacts from raw agent output.
 * Strips ANSI codes then filters lines that consist only of box-drawing
 * characters or contain no word characters (TUI tab-bar / border fragments).
 */
function cleanAgentOutput(raw: string): string {
	const noAnsi = raw.replace(ANSI_RE, '').replace(/\r/g, '')
	const lines = noAnsi.split('\n').filter(line => {
		const stripped = line.replace(BOX_RE, '').trim()
		return /\w/.test(stripped)
	})
	return lines.join('\n')
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
		gemini: 'npm install -g @google/gemini-cli',
		claude:
			'npm install -g @anthropic/claude-code or see https://www.anthropic.com/claude-code',
		codex: 'npm install -g openai-codex or see https://openai.com/codex',
		'opencode-ai': 'npm install -g opencode-ai or see https://opencode.ai',
		copilot:
			'gh extension install github/gh-copilot  (requires GitHub CLI: https://cli.github.com)',
		cline:
			'Install the Cline extension in VS Code (marketplace.visualstudio.com/items?itemName=saoudrizwan.claude-dev). Note: Cline runs inside VS Code and does not stream output to the terminal.',
		kilo: 'Install the Kilo extension in VS Code. Note: Kilo runs inside VS Code and does not stream output to the terminal.',
	}
	return hints[agentId] ?? ''
}

async function runAgent(
	agent: AgentDefinition,
	prompt: string,
	workspace: string | undefined,
	model: string | undefined,
	shell: string | undefined,
	onChunk: (chunk: string) => void,
	onDone: () => void,
	onError: (err: string) => void,
	onProcSpawned?: (proc: ReturnType<typeof spawn>) => void,
	onStdinReady?: (write: (text: string) => void) => void,
): Promise<void> {
	const args: string[] = []

	if (model && agent.modelFlag) {
		args.push(agent.modelFlag, model)
	}

	// Use ?? so an explicit empty string (positional-arg agents) is preserved
	const promptFlag = agent.promptFlag !== undefined ? agent.promptFlag : '-p'
	if (promptFlag) {
		args.push(promptFlag, prompt)
	} else {
		// Positional arg — prompt goes last with no flag
		args.push(prompt)
	}

	const fullArgs = [...agent.args, ...args]

	const spinner = ora(`Running ${agent.name}...`).start()

	let proc: ReturnType<typeof spawn>

	if (shell) {
		const shellBase = shell
			.toLowerCase()
			.replace(/\.exe$/, '')
			.replace(/^.*[\\/]/, '')
		const isPs = shellBase === 'powershell' || shellBase === 'pwsh'
		const isCmd = shellBase === 'cmd'

		if (isPs) {
			// PowerShell: prefix with & so the first token is a command invocation,
			// not a string expression. Single-quote all args; '' escapes a literal '.
			const commandStr =
				'& ' +
				[agent.command, ...fullArgs]
					.map(a => `'${a.replace(/'/g, "''")}'`)
					.join(' ')
			proc = spawn(shell, ['-Command', commandStr], {
				cwd: workspace,
				stdio: ['pipe', 'pipe', 'pipe'],
			})
		} else if (isCmd) {
			// cmd.exe: /d /s /c with double-quoted args; "" escapes a literal "
			const commandStr = [agent.command, ...fullArgs]
				.map(a => `"${a.replace(/"/g, '""')}"`)
				.join(' ')
			proc = spawn(shell, ['/d', '/s', '/c', commandStr], {
				cwd: workspace,
				stdio: ['pipe', 'pipe', 'pipe'],
			})
		} else {
			// POSIX shells (bash, zsh, sh…): -c with single-quoted args.
			// '\'' is the POSIX escape for a literal single-quote inside '…'.
			const commandStr = [agent.command, ...fullArgs]
				.map(a => `'${a.replace(/'/g, "'\\''")}'`)
				.join(' ')
			proc = spawn(shell, ['-c', commandStr], {
				cwd: workspace,
				stdio: ['pipe', 'pipe', 'pipe'],
			})
		}
	} else {
		// No shell specified – construct a properly-quoted command string so that
		// prompts containing spaces are not split into separate arguments.
		if (process.platform === 'win32') {
			// Windows: route through cmd.exe; "" escapes a literal "
			const commandStr = [agent.command, ...fullArgs]
				.map(a => `"${a.replace(/"/g, '""')}"`)
				.join(' ')
			proc = spawn('cmd', ['/d', '/s', '/c', commandStr], {
				cwd: workspace,
				stdio: ['pipe', 'pipe', 'pipe'],
			})
		} else {
			// POSIX: route through /bin/sh; '\'' escapes a literal single-quote
			const commandStr = [agent.command, ...fullArgs]
				.map(a => `'${a.replace(/'/g, "'\\''")}'`)
				.join(' ')
			proc = spawn('/bin/sh', ['-c', commandStr], {
				cwd: workspace,
				stdio: ['pipe', 'pipe', 'pipe'],
			})
		}
	}

	onProcSpawned?.(proc)

	if (proc.stdin && onStdinReady) {
		onStdinReady((text: string) => {
			if (proc.stdin && !proc.stdin.destroyed) {
				proc.stdin.write(text + '\n', 'utf8')
			}
		})
	}

	// 60-second no-output watchdog: kills the process if nothing is written to
	// stdout/stderr within the first minute (catches VS Code extensions that
	// dispatch tasks to the IDE without writing to their own stdout).
	const NO_OUTPUT_TIMEOUT_MS = 60_000
	let gotOutput = false
	const watchdog = setTimeout(() => {
		if (!gotOutput) {
			spinner.stop()
			proc.kill()
			onError(
				`Agent produced no output within ${NO_OUTPUT_TIMEOUT_MS / 1000}s. ` +
					`It may require an interactive terminal (e.g. VS Code extension).`,
			)
		}
	}, NO_OUTPUT_TIMEOUT_MS)

	const {stdout, stderr} = proc
	if (!stdout || !stderr) {
		clearTimeout(watchdog)
		onError('Failed to create process streams')
		spinner.stop()
		return
	}

	let spawnFailed = false

	stdout.setEncoding('utf8')
	stdout.on('data', (chunk: string) => {
		gotOutput = true
		clearTimeout(watchdog)
		spinner.stop()
		const cleaned = cleanAgentOutput(chunk)
		if (cleaned) onChunk(cleaned)
	})

	stderr.setEncoding('utf8')
	stderr.on('data', (chunk: string) => {
		gotOutput = true
		clearTimeout(watchdog)
		spinner.stop()
		const cleaned = cleanAgentOutput(chunk)
		if (cleaned) onChunk(cleaned)
	})

	proc.on('close', code => {
		clearTimeout(watchdog)
		spinner.stop()
		if (spawnFailed) return
		if (code !== 0 && code !== null) {
			onError(`Agent exited with code ${code}`)
		} else {
			onDone()
		}
	})

	proc.on('error', err => {
		clearTimeout(watchdog)
		spinner.stop()
		spawnFailed = true
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
	.option(
		'-s, --shell <shell>',
		'Run agent through a specific shell (e.g. powershell, cmd, bash, zsh)',
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

		const agents = await loadAgents(serverUrl, apiToken)
		let agent: AgentDefinition | undefined = findAgent(agents, agentId)
		if (!agent) {
			agent = {
				id: agentId,
				name: agentId,
				provider: 'custom' as const,
				command: agentId,
				args: [],
				promptFlag: '-p',
				description: `Custom agent: ${agentId}`,
			}
			if (verbose) {
				console.log(`No config found for "${agentId}", using as raw command.`)
			}
			debug('No agent config found, using raw command:', agentId)
		} else {
			debug(
				'Agent:',
				agent.name,
				'— command:',
				agent.command,
				'args:',
				JSON.stringify(agent.args),
			)
		}

		if (!(await checkCommandExists(agent.command))) {
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
		debug('WebSocket URL:', wsUrl)
		debug('Workspace:', workspace ?? '(none)')
		debug('Model:', model ?? '(default)')
		debug('Shell:', opts.shell ?? '(default)')

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
				if (model) {
					socket.send(JSON.stringify({type: 'model', model}))
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

					runAgent(
						agent!,
						opts.prompt,
						workspace,
						model,
						opts.shell,
						chunk => {
							process.stdout.write(chunk)
							if (socket.readyState === WebSocket.OPEN) {
								socket.send(
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
							if (socket.readyState === WebSocket.OPEN) {
								socket.send(
									JSON.stringify({
										type: 'response',
										content: '',
										sessionId,
										done: true,
									}),
								)
							}
							intentionalClose = true
							socket.close()
							process.exit(0)
						},
						err => {
							console.error(`\n✗ Agent error: ${err}`)
							if (socket.readyState === WebSocket.OPEN) {
								socket.send(
									JSON.stringify({type: 'error', message: err, sessionId}),
								)
							}
							intentionalClose = true
							socket.close()
							process.exit(1)
						},
					)
				}
			})

			if (!opts.prompt) {
				let agentRunning = false
				let currentAgentProc: ReturnType<typeof spawn> | null = null
				let currentStdinWrite: ((text: string) => void) | null = null

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
						if (currentAgentProc) {
							currentAgentProc.kill()
							currentAgentProc = null
						}
						currentStdinWrite = null
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
						log('Model updated:', wsMsg.model)
						return
					}

					if (msg.type === 'input') {
						const inputMsg = msg as WsInput
						if (currentStdinWrite) {
							currentStdinWrite(inputMsg.content)
							console.log(
								`  ↩ Input [${inputMsg.sessionId}]: ${inputMsg.content.slice(0, 40)}`,
							)
						}
						return
					}

					if (msg.type === 'input') {
						const inputMsg = msg as WsInput
						if (currentStdinWrite) {
							currentStdinWrite(inputMsg.content)
							console.log(
								`  ↩ Input [${inputMsg.sessionId}]: ${inputMsg.content.slice(0, 40)}`,
							)
						}
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

					runAgent(
						agent!,
						content,
						workspace,
						model,
						opts.shell,
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
							currentAgentProc = null
							currentStdinWrite = null
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
							currentAgentProc = null
							currentStdinWrite = null
							console.error(`\n✗ Agent error [${sessionId}]: ${err}`)
							if (socket.readyState === WebSocket.OPEN) {
								socket.send(
									JSON.stringify({type: 'error', message: err, sessionId}),
								)
							}
						},
						proc => {
							currentAgentProc = proc
						},
						write => {
							currentStdinWrite = write
						},
					)
				})

				socket.on('close', () => {
					if (currentAgentProc) {
						currentAgentProc.kill()
						currentAgentProc = null
					}
					currentStdinWrite = null
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
			process.exit(0)
		})

		connectWs()
	})
