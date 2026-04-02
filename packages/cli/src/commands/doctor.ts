import {discoverAgents} from '../services/agent-discovery.js'
import {isOpencodeRunning} from '../utils/opencode-server.js'
import type {AgentsConfig} from '../types/llm-provider.js'
import {existsSync, readFileSync, writeFileSync} from 'fs'
import {DEFAULT_AGENTS} from '../utils/agents-config.js'
import {detectPrereqs} from '../utils/prereqs.js'
import {readConfig} from '../config.js'
import {execSync} from 'child_process'
import {Command} from 'commander'
import {homedir} from 'os'
import {join} from 'path'

const HAPPY_DIR = join(homedir(), '.happy')
const AGENTS_FILE = join(HAPPY_DIR, 'agents.json')
const CONFIG_FILE = join(HAPPY_DIR, 'config.json')

interface CheckResult {
	label: string
	status: 'pass' | 'warn' | 'fail' | 'info'
	detail?: string
	fix?: string
}

function statusIcon(s: CheckResult['status']): string {
	switch (s) {
		case 'pass':
			return '✅'
		case 'warn':
			return '⚠️ '
		case 'fail':
			return '❌'
		case 'info':
			return 'ℹ️ '
	}
}

function printTable(rows: CheckResult[], useColor: boolean): void {
	const labelW = Math.max(20, ...rows.map(r => r.label.length)) + 2
	const sep = '─'.repeat(labelW + 52)

	if (useColor) {
		process.stdout.write(`\n${sep}\n`)
		process.stdout.write(` ${'CHECK'.padEnd(labelW)} STATUS  DETAIL\n`)
		process.stdout.write(`${sep}\n`)
	}

	for (const row of rows) {
		const icon = statusIcon(row.status)
		const label = row.label.padEnd(labelW)
		const detail = row.detail ? ` — ${row.detail}` : ''
		process.stdout.write(` ${label} ${icon}  ${detail}\n`)
		if (row.fix) {
			process.stdout.write(`   ${''.padEnd(labelW)}→ ${row.fix}\n`)
		}
	}

	if (useColor) process.stdout.write(`${sep}\n`)
}

function checkBinaryExists(command: string): boolean {
	const isWindows = process.platform === 'win32'
	const cmd = isWindows ? `where ${command}` : `which ${command}`
	try {
		execSync(cmd, {stdio: 'ignore'})
		return true
	} catch {
		return false
	}
}

function runConfigChecks(fixAgents: boolean): CheckResult[] {
	const results: CheckResult[] = []

	if (!existsSync(HAPPY_DIR)) {
		results.push({
			label: '~/.happy directory',
			status: 'warn',
			detail: 'not found',
			fix: 'Run: happy init',
		})
		return results
	}

	if (!existsSync(CONFIG_FILE)) {
		results.push({
			label: 'config.json',
			status: 'fail',
			detail: 'not found',
			fix: 'Run: happy login',
		})
	} else {
		const config = readConfig()
		if (!config) {
			results.push({
				label: 'config.json',
				status: 'fail',
				detail: 'invalid/corrupted',
				fix: 'Run: happy config reset',
			})
		} else if (!config.apiToken) {
			results.push({
				label: 'config.json',
				status: 'warn',
				detail: 'no API token',
				fix: 'Run: happy login',
			})
		} else {
			results.push({label: 'config.json', status: 'pass', detail: 'valid'})
		}
	}

	if (!existsSync(AGENTS_FILE)) {
		results.push({
			label: 'agents.json',
			status: 'fail',
			detail: 'not found',
			fix: fixAgents ? 'Regenerating...' : 'Run: happy init or --fix-agents',
		})
		if (fixAgents) {
			writeFileSync(AGENTS_FILE, JSON.stringify(DEFAULT_AGENTS, null, 2))
			results.push({
				label: 'agents.json',
				status: 'pass',
				detail: 'regenerated',
			})
		}
	} else {
		try {
			const agents = JSON.parse(
				readFileSync(AGENTS_FILE, 'utf8'),
			) as AgentsConfig
			if (!agents.agents || agents.agents.length === 0) {
				results.push({
					label: 'agents.json',
					status: 'warn',
					detail: 'no agents configured',
					fix: fixAgents
						? 'Regenerating...'
						: 'Run: happy init or --fix-agents',
				})
				if (fixAgents) {
					writeFileSync(AGENTS_FILE, JSON.stringify(DEFAULT_AGENTS, null, 2))
					results.push({
						label: 'agents.json',
						status: 'pass',
						detail: 'regenerated',
					})
				}
			} else {
				results.push({
					label: 'agents.json',
					status: 'pass',
					detail: `${agents.agents.length} agent(s)`,
				})

				for (const agent of agents.agents) {
					if (!agent.command) {
						results.push({
							label: `agent: ${agent.id}`,
							status: 'warn',
							detail: 'no command defined',
						})
					} else if (!checkBinaryExists(agent.command)) {
						results.push({
							label: `agent: ${agent.id}`,
							status: 'warn',
							detail: `"${agent.command}" not in PATH`,
							fix: `Install ${agent.name} or update ~/.happy/agents.json`,
						})
					} else {
						results.push({
							label: `agent: ${agent.id}`,
							status: 'pass',
							detail: `"${agent.command}" found`,
						})
					}

					if (
						agent.id === 'opencode-ai' &&
						(!agent.args || !agent.args.includes('run'))
					) {
						results.push({
							label: 'opencode-ai args',
							status: 'warn',
							detail: 'missing "run" subcommand',
							fix: fixAgents ? 'Fixing...' : 'Run: happy doctor --fix-agents',
						})
						if (fixAgents) {
							agents.agents = agents.agents.map(a =>
								a.id === 'opencode-ai' ? {...a, args: ['run']} : a,
							)
							writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2))
							results.push({
								label: 'opencode-ai args',
								status: 'pass',
								detail: 'fixed',
							})
						}
					}
				}
			}
		} catch {
			results.push({
				label: 'agents.json',
				status: 'fail',
				detail: 'corrupted',
				fix: fixAgents ? 'Regenerating...' : 'Run: happy doctor --fix-agents',
			})
			if (fixAgents) {
				writeFileSync(AGENTS_FILE, JSON.stringify(DEFAULT_AGENTS, null, 2))
				results.push({
					label: 'agents.json',
					status: 'pass',
					detail: 'regenerated',
				})
			}
		}
	}

	return results
}

export const doctorCommand = new Command('doctor')
	.description('Diagnose and fix configuration issues')
	.option('-f, --fix', 'Automatically fix issues where possible')
	.option('--fix-agents', 'Regenerate agents.json with correct defaults')
	.action(async opts => {
		const fix = opts.fix || opts.fixAgents
		const useColor = process.stdout.isTTY && !process.env.NO_COLOR

		console.log('\n╔════════════════════════════════╗')
		console.log('║  Happy Vibecode — Doctor       ║')
		console.log('╚════════════════════════════════╝\n')

		const all: CheckResult[] = []

		// ── Prerequisites ────────────────────────────────────────────
		console.log('⏳ Checking prerequisites...')
		const prereqs = await detectPrereqs()
		for (const p of prereqs) {
			all.push({
				label: `prereq: ${p.tool}`,
				status: p.installed ? 'pass' : p.required ? 'fail' : 'warn',
				detail: p.installed ? (p.version ?? 'found') : 'not installed',
				fix: p.installed
					? undefined
					: ((p.installHints as Record<string, string>)[process.platform] ??
						p.installHints.linux),
			})
		}

		// ── Config / agents.json ─────────────────────────────────────
		console.log('⏳ Checking config files...')
		const configResults = runConfigChecks(fix)
		all.push(...configResults)

		// ── Agent CLI discovery ───────────────────────────────────────
		console.log('⏳ Scanning for agent CLIs...')
		const discovered = await discoverAgents(true)
		for (const a of discovered) {
			all.push({
				label: `cli: ${a.displayName}`,
				status: a.available ? 'pass' : 'warn',
				detail: a.available
					? a.version
						? `v${a.version}`
						: 'found'
					: 'not in PATH',
				fix: a.available ? undefined : `Install ${a.displayName}`,
			})
		}

		// ── OpenCode server ───────────────────────────────────────────
		console.log('⏳ Checking opencode server...')
		const running = await isOpencodeRunning()
		all.push({
			label: 'opencode server',
			status: running ? 'pass' : 'info',
			detail: running
				? 'running on port 4096'
				: 'not running (auto-starts on connect)',
		})

		// ── Render table ──────────────────────────────────────────────
		printTable(all, useColor)

		const hasErrors = all.some(r => r.status === 'fail')
		const hasWarnings = all.some(r => r.status === 'warn')

		console.log('')
		if (hasErrors) {
			console.log('❌  Configuration has errors — run missing steps above.')
		} else if (hasWarnings) {
			console.log(
				`⚠️   Configuration has warnings.${!fix ? '  Run with --fix to auto-repair.' : ''}`,
			)
		} else {
			console.log('✅  Everything looks great!')
		}

		process.exit(hasErrors ? 1 : 0)
	})
