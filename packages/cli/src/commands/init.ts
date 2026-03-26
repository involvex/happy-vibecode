import {DEFAULT_AGENTS} from '../utils/agents-config.js'
// import type {AgentsConfig} from '../types/llm-provider.js'
import {existsSync, mkdirSync, writeFileSync} from 'fs'
import {readConfig} from '../config.js'
import {Command} from 'commander'
import {homedir} from 'os'
import {join} from 'path'
const HAPPY_DIR = join(homedir(), '.happy')
const AGENTS_FILE = join(HAPPY_DIR, 'agents.json')

export const initCommand = new Command('init')
	.description('Initialize Happy Vibecode config with default agents')
	.action(() => {
		if (!existsSync(HAPPY_DIR)) {
			mkdirSync(HAPPY_DIR, {recursive: true})
		}

		if (existsSync(AGENTS_FILE)) {
			console.log(`Config already exists at ${AGENTS_FILE}`)
			console.log('Use --force to overwrite.')
			return
		}

		writeFileSync(AGENTS_FILE, JSON.stringify(DEFAULT_AGENTS, null, 2))
		console.log(`✓ Created ${AGENTS_FILE}`)
		console.log('')
		console.log('Edit the file to add or customize your agents.')
		console.log('Then run: happy-vibecode connect <agent-id>')

		const config = readConfig()
		if (!config) {
			console.log('\nNext step: happy-vibecode login')
		}
	})
