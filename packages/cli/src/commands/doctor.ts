import type {AgentsConfig} from '../types/llm-provider.js'
import {existsSync, readFileSync, writeFileSync} from 'fs'
import {DEFAULT_AGENTS} from '../utils/agents-config.js'
import {readConfig} from '../config.js'
import {execSync} from 'child_process'
import {Command} from 'commander'
import {homedir} from 'os'
import {join} from 'path'

const HAPPY_DIR = join(homedir(), '.happy')
const AGENTS_FILE = join(HAPPY_DIR, 'agents.json')
const CONFIG_FILE = join(HAPPY_DIR, 'config.json')

// const DEFAULT_AGENTS: AgentsConfig = {
// 	agents: [
// 		{
// 			id: 'gemini',
// 			name: 'Gemini CLI',
// 			command: 'gemini',
// 			args: [],
// 			promptFlag: '-p',
// 			workspaceFlag: '--dir',
// 			description: 'Google Gemini CLI agent',
// 		},
// 		{
// 			id: 'claude',
// 			name: 'Claude Code',
// 			command: 'claude',
// 			args: [],
// 			promptFlag: '-p',
// 			workspaceFlag: '--dir',
// 			modelFlag: '-m',
// 			description: 'Anthropic Claude CLI agent',
// 		},
// 		{
// 			id: 'codex',
// 			name: 'OpenAI Codex',
// 			command: 'codex',
// 			args: [],
// 			promptFlag: '-p',
// 			description: 'OpenAI Codex CLI agent',
// 		},
// 		{
// 			id: 'opencode-ai',
// 			name: 'OpenCode AI',
// 			command: 'opencode',
// 			args: ['run'],
// 			promptFlag: '--prompt',
// 			description: 'OpenCode AI CLI agent',
// 		},
// 		{
// 			id: 'copilot',
// 			name: 'GitHub Copilot',
// 			command: 'copilot',
// 			args: [],
// 			promptFlag: '-p',
// 			description: 'GitHub Copilot CLI agent',
// 		},
// 	],
// 	workspaces: [],
// }

interface Issue {
	type: 'error' | 'warning' | 'info'
	message: string
	fix?: string
}

function checkBinaryExists(command: string): boolean {
	// const {execSync} = require('child_process')
	const isWindows = process.platform === 'win32'
	const cmd = isWindows ? `where ${command}` : `which ${command}`
	try {
		execSync(cmd, {stdio: 'ignore'})
		return true
	} catch {
		return false
	}
}

function runDiagnostics(fixAgents: boolean): Issue[] {
	const issues: Issue[] = []

	if (!existsSync(HAPPY_DIR)) {
		issues.push({
			type: 'warning',
			message: '.happy directory does not exist',
			fix: 'Run: happy-vibecode init',
		})
		return issues
	}

	if (!existsSync(CONFIG_FILE)) {
		issues.push({
			type: 'error',
			message: 'Config file not found (~/.happy/config.json)',
			fix: 'Run: happy-vibecode login',
		})
	} else {
		const config = readConfig()
		if (!config) {
			issues.push({
				type: 'error',
				message: 'Config file is invalid or corrupted',
				fix: 'Run: happy-vibecode config reset',
			})
		} else if (!config.apiToken) {
			issues.push({
				type: 'warning',
				message: 'API token not set',
				fix: 'Run: happy-vibecode login',
			})
		} else {
			issues.push({type: 'info', message: '✓ Config file valid'})
		}
	}

	if (!existsSync(AGENTS_FILE)) {
		issues.push({
			type: 'error',
			message: 'Agents config not found (~/.happy/agents.json)',
			fix: fixAgents
				? 'Regenerating agents.json...'
				: 'Run: happy-vibecode init or --fix-agents',
		})
		if (fixAgents) {
			writeFileSync(AGENTS_FILE, JSON.stringify(DEFAULT_AGENTS, null, 2))
			issues.push({type: 'info', message: '✓ Regenerated agents.json'})
		}
	} else {
		try {
			const agents = JSON.parse(
				readFileSync(AGENTS_FILE, 'utf8'),
			) as AgentsConfig
			if (!agents.agents || agents.agents.length === 0) {
				issues.push({
					type: 'warning',
					message: 'No agents configured',
					fix: fixAgents
						? 'Regenerating agents.json...'
						: 'Run: happy-vibecode init or --fix-agents',
				})
				if (fixAgents) {
					writeFileSync(AGENTS_FILE, JSON.stringify(DEFAULT_AGENTS, null, 2))
					issues.push({type: 'info', message: '✓ Regenerated agents.json'})
				}
			} else {
				issues.push({
					type: 'info',
					message: `✓ ${agents.agents.length} agent(s) configured`,
				})

				for (const agent of agents.agents) {
					if (!agent.command) {
						issues.push({
							type: 'warning',
							message: `Agent "${agent.id}" has no command defined`,
						})
					} else if (!checkBinaryExists(agent.command)) {
						issues.push({
							type: 'warning',
							message: `Binary "${agent.command}" not found in PATH (agent: ${agent.id})`,
							fix: `Install ${agent.name} or update the command in ~/.happy/agents.json`,
						})
					}

					if (
						agent.id === 'opencode-ai' &&
						(!agent.args || !agent.args.includes('run'))
					) {
						issues.push({
							type: 'warning',
							message:
								'opencode-ai agent missing "run" subcommand - prompts will not work',
							fix: fixAgents
								? 'Fixing opencode-ai agent config...'
								: 'Run: happy-vibecode doctor --fix-agents',
						})
						if (fixAgents) {
							agents.agents = agents.agents.map(a =>
								a.id === 'opencode-ai' ? {...a, args: ['run']} : a,
							)
							writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2))
							issues.push({
								type: 'info',
								message: '✓ Fixed opencode-ai agent config',
							})
						}
					}
				}
			}
		} catch {
			issues.push({
				type: 'error',
				message: 'Agents config is corrupted',
				fix: fixAgents
					? 'Regenerating agents.json...'
					: 'Run: happy-vibecode doctor --fix-agents',
			})
			if (fixAgents) {
				writeFileSync(AGENTS_FILE, JSON.stringify(DEFAULT_AGENTS, null, 2))
				issues.push({type: 'info', message: '✓ Regenerated agents.json'})
			}
		}
	}

	return issues
}

export const doctorCommand = new Command('doctor')
	.description('Diagnose and fix configuration issues')
	.option('-f, --fix', 'Automatically fix issues where possible')
	.option('--fix-agents', 'Regenerate agents.json with correct defaults')
	.action(opts => {
		const fix = opts.fix || opts.fixAgents
		console.log('\n=== Happy Vibecode Doctor ===\n')
		console.log('Running diagnostics...\n')

		const issues = runDiagnostics(fix)

		let hasErrors = false
		let hasWarnings = false

		for (const issue of issues) {
			if (issue.type === 'error') {
				hasErrors = true
				console.log(`✗ ${issue.message}`)
			} else if (issue.type === 'warning') {
				hasWarnings = true
				console.log(`⚠ ${issue.message}`)
			} else {
				console.log(issue.message)
			}

			if (issue.fix && !fix) {
				console.log(`  → ${issue.fix}`)
			}
			console.log('')
		}

		if (hasErrors) {
			console.log('❌ Configuration has errors that need attention.')
			process.exit(1)
		} else if (hasWarnings) {
			console.log('⚠️  Configuration has warnings.')
			if (!fix) {
				console.log('Run with --fix or --fix-agents to auto-fix.')
			}
		} else {
			console.log('✅ Configuration looks good!')
		}
	})
