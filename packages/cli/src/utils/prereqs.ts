import {execSync} from 'node:child_process'
import os from 'node:os'

export interface PrereqResult {
	tool: string
	displayName: string
	installed: boolean
	version?: string
	required: boolean
	minVersion?: string
	versionOk: boolean
	installHints: {win32: string; darwin: string; linux: string}
}

function tryExec(cmd: string): string | undefined {
	try {
		return execSync(cmd, {
			encoding: 'utf8',
			stdio: ['pipe', 'pipe', 'pipe'],
			timeout: 5000,
		}).trim()
	} catch {
		return undefined
	}
}

function semverGte(actual: string, min: string): boolean {
	const clean = (v: string) => v.replace(/[^0-9.]/g, '')
	const a = clean(actual).split('.').map(Number)
	const b = clean(min).split('.').map(Number)
	for (let i = 0; i < Math.max(a.length, b.length); i++) {
		const av = a[i] ?? 0
		const bv = b[i] ?? 0
		if (av > bv) return true
		if (av < bv) return false
	}
	return true
}

export async function detectPrereqs(): Promise<PrereqResult[]> {
	const results: PrereqResult[] = []

	// Bun
	const bunRaw = tryExec('bun --version')
	results.push({
		tool: 'bun',
		displayName: 'Bun (≥1.3)',
		installed: !!bunRaw,
		version: bunRaw ?? undefined,
		required: true,
		minVersion: '1.3.0',
		versionOk: bunRaw ? semverGte(bunRaw, '1.3.0') : false,
		installHints: {
			win32: 'powershell -c "irm bun.sh/install.ps1 | iex"',
			darwin: 'curl -fsSL https://bun.sh/install | bash',
			linux: 'curl -fsSL https://bun.sh/install | bash',
		},
	})

	// Node.js
	const nodeRaw = tryExec('node --version')
	const nodeVersion = nodeRaw?.replace('v', '') ?? undefined
	results.push({
		tool: 'node',
		displayName: 'Node.js (≥20)',
		installed: !!nodeVersion,
		version: nodeVersion,
		required: false,
		minVersion: '20.0.0',
		versionOk: nodeVersion ? semverGte(nodeVersion, '20.0.0') : false,
		installHints: {
			win32: 'winget install OpenJS.NodeJS.LTS',
			darwin: 'brew install node@20',
			linux:
				'curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs',
		},
	})

	// Wrangler
	const wranglerRaw = tryExec('wrangler --version')
	const wranglerVersion =
		wranglerRaw?.match(/(\d+\.\d+\.\d+)/)?.[1] ?? undefined
	results.push({
		tool: 'wrangler',
		displayName: 'Wrangler CLI (≥3)',
		installed: !!wranglerVersion,
		version: wranglerVersion,
		required: true,
		minVersion: '3.0.0',
		versionOk: wranglerVersion ? semverGte(wranglerVersion, '3.0.0') : false,
		installHints: {
			win32: 'bun add -g wrangler',
			darwin: 'bun add -g wrangler',
			linux: 'bun add -g wrangler',
		},
	})

	// GitHub CLI
	const ghRaw = tryExec('gh --version')
	const ghVersion = ghRaw?.match(/(\d+\.\d+\.\d+)/)?.[1] ?? undefined
	results.push({
		tool: 'gh',
		displayName: 'GitHub CLI',
		installed: !!ghVersion,
		version: ghVersion,
		required: false,
		minVersion: undefined,
		versionOk: !!ghVersion,
		installHints: {
			win32: 'winget install GitHub.cli',
			darwin: 'brew install gh',
			linux: 'sudo apt install gh',
		},
	})

	// Git
	const gitRaw = tryExec('git --version')
	const gitVersion = gitRaw?.match(/(\d+\.\d+\.\d+)/)?.[1] ?? undefined
	results.push({
		tool: 'git',
		displayName: 'Git',
		installed: !!gitVersion,
		version: gitVersion,
		required: true,
		minVersion: undefined,
		versionOk: !!gitVersion,
		installHints: {
			win32: 'winget install Git.Git',
			darwin: 'xcode-select --install',
			linux: 'sudo apt install git',
		},
	})

	return results
}

export function getInstallHint(result: PrereqResult): string {
	const platform = os.platform() as 'win32' | 'darwin' | 'linux'
	return result.installHints[platform] ?? result.installHints.linux
}

export interface PrereqSummary {
	allRequiredOk: boolean
	issues: PrereqResult[]
}

export function getPrereqSummary(results: PrereqResult[]): PrereqSummary {
	const issues = results.filter(r => !r.installed || !r.versionOk)
	const allRequiredOk = results
		.filter(r => r.required)
		.every(r => r.installed && r.versionOk)
	return {allRequiredOk, issues}
}
