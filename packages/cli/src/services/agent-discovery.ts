import {execSync} from 'node:child_process'
import {existsSync} from 'node:fs'
import os from 'node:os'

export interface AgentDiscoveryResult {
	id: string
	displayName: string
	command: string
	fullPath?: string
	version?: string
	available: boolean
}

const KNOWN_AGENTS: Array<{
	id: string
	displayName: string
	command: string
	versionFlag: string
}> = [
	{
		id: 'gemini',
		displayName: 'Gemini CLI',
		command: 'gemini',
		versionFlag: '--version',
	},
	{
		id: 'claude',
		displayName: 'Claude Code',
		command: 'claude',
		versionFlag: '--version',
	},
	{
		id: 'codex',
		displayName: 'OpenAI Codex CLI',
		command: 'codex',
		versionFlag: '--version',
	},
	{
		id: 'opencode-ai',
		displayName: 'OpenCode.ai',
		command: 'opencode',
		versionFlag: '--version',
	},
	{
		id: 'copilot',
		displayName: 'GitHub Copilot CLI',
		command: 'gh',
		versionFlag: '--version',
	},
	{
		id: 'kilo',
		displayName: 'Kilo Code',
		command: 'kilo',
		versionFlag: '--version',
	},
	{
		id: 'cline',
		displayName: 'Cline CLI',
		command: 'cline',
		versionFlag: '--version',
	},
	{
		id: 'custom',
		displayName: 'Custom Agent',
		command: 'custom-agent',
		versionFlag: '--version',
	},
]

let cache: {results: AgentDiscoveryResult[]; at: number} | undefined
const CACHE_TTL = 5 * 60 * 1000

function resolveCommandPath(cmd: string): string | undefined {
	const isWindows = os.platform() === 'win32'
	try {
		if (isWindows) {
			const result = execSync(`where.exe "${cmd}" 2>nul`, {
				encoding: 'utf8',
				stdio: ['pipe', 'pipe', 'pipe'],
				timeout: 3000,
			})
				.trim()
				.split('\n')[0]
				?.trim()
			return result && existsSync(result) ? result : undefined
		} else {
			const result = execSync(`command -v "${cmd}" 2>/dev/null`, {
				encoding: 'utf8',
				stdio: ['pipe', 'pipe', 'pipe'],
				timeout: 3000,
				shell: '/bin/sh',
			}).trim()
			return result || undefined
		}
	} catch {
		return undefined
	}
}

function getVersion(fullPath: string, versionFlag: string): string | undefined {
	try {
		const raw = execSync(`"${fullPath}" ${versionFlag} 2>&1`, {
			encoding: 'utf8',
			stdio: ['pipe', 'pipe', 'pipe'],
			timeout: 5000,
		}).trim()
		return raw.match(/(\d+\.\d+[.\d]*)/)?.[1] ?? raw.slice(0, 40)
	} catch {
		return undefined
	}
}

export async function discoverAgents(
	forceRefresh = false,
): Promise<AgentDiscoveryResult[]> {
	if (!forceRefresh && cache && Date.now() - cache.at < CACHE_TTL) {
		return cache.results
	}

	const results: AgentDiscoveryResult[] = []
	for (const agent of KNOWN_AGENTS) {
		const fullPath = resolveCommandPath(agent.command)
		if (fullPath) {
			const version = getVersion(fullPath, agent.versionFlag)
			results.push({
				id: agent.id,
				displayName: agent.displayName,
				command: agent.command,
				fullPath,
				version,
				available: true,
			})
		} else {
			results.push({
				id: agent.id,
				displayName: agent.displayName,
				command: agent.command,
				available: false,
			})
		}
	}

	cache = {results, at: Date.now()}
	return results
}

export function getAvailableAgents(
	results: AgentDiscoveryResult[],
): AgentDiscoveryResult[] {
	return results.filter(r => r.available)
}

export function findAgent(
	results: AgentDiscoveryResult[],
	id: string,
): AgentDiscoveryResult | undefined {
	return results.find(r => r.id === id)
}
