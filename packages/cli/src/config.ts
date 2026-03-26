import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'fs'
import {homedir} from 'os'
import {join} from 'path'

export interface HappyConfig {
	apiToken: string
	serverUrl: string
	userId?: string
}

const CONFIG_DIR = join(homedir(), '.happy')
const CONFIG_FILE = join(CONFIG_DIR, 'config.json')

export function readConfig(): HappyConfig | null {
	if (!existsSync(CONFIG_FILE)) return null
	try {
		return JSON.parse(readFileSync(CONFIG_FILE, 'utf8')) as HappyConfig
	} catch {
		return null
	}
}

export function writeConfig(config: HappyConfig): void {
	if (!existsSync(CONFIG_DIR)) {
		mkdirSync(CONFIG_DIR, {recursive: true})
	}
	writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
}

export function requireConfig(): HappyConfig {
	const config = readConfig()
	if (!config?.apiToken) {
		console.error('Not logged in. Run: happy login')
		process.exit(1)
	}
	return config
}

export const DEFAULT_SERVER_URL = 'https://happy-vibecode.involvex.workers.dev'
