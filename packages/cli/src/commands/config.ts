import {
	readConfig,
	writeConfig,
	DEFAULT_SERVER_URL,
	type HappyConfig,
} from '../config.js'
import {Command} from 'commander'
import {existsSync} from 'fs'
import {homedir} from 'os'
import {join} from 'path'
import fs from 'node:fs'

const configCommand = new Command('config').description(
	'Manage Happy Vibecode configuration',
)

configCommand
	.command('show')
	.description('Show current configuration')
	.option('-j, --json', 'Output as JSON')
	.action(opts => {
		const config = readConfig()
		if (!config) {
			console.log('No configuration found. Run: happy-vibecode login')
			return
		}

		if (opts.json) {
			console.log(JSON.stringify(config, null, 2))
			return
		}

		console.log('\n=== Happy Vibecode Configuration ===\n')
		console.log(`Server URL:  ${config.serverUrl || DEFAULT_SERVER_URL}`)
		console.log(`User ID:     ${config.userId || '(not set)'}`)
		console.log(
			`API Token:   ${config.apiToken ? config.apiToken.slice(0, 8) + '••••••••' + config.apiToken.slice(-4) : '(not set)'}`,
		)
		console.log('')
		process.exit(1)
	})

configCommand
	.command('set')
	.description('Set a configuration value')
	.argument('<key>', 'Key to set (serverUrl, userId, apiToken)')
	.argument('<value>', 'Value to set')
	.action((key, value) => {
		if (!['serverUrl', 'userId', 'apiToken'].includes(key)) {
			console.error(`Invalid key: ${key}`)
			console.error('Valid keys: serverUrl, userId, apiToken')
			process.exit(1)
		}

		const config = readConfig() || {apiToken: '', serverUrl: DEFAULT_SERVER_URL}
		config[key as keyof typeof config] = value
		writeConfig(config)
		console.log(`✓ Set ${key} = ${value}`)
		process.exit(1)
	})

configCommand
	.command('unset')
	.description('Remove a configuration value')
	.argument('<key>', 'Key to remove (serverUrl, userId)')
	.action(key => {
		if (!['serverUrl', 'userId'].includes(key)) {
			console.error(`Invalid key: ${key}`)
			console.error('Valid keys: serverUrl, userId')
			process.exit(1)
		}

		const config = readConfig()
		if (!config) {
			console.error('No configuration found')
			process.exit(1)
		}

		delete config[key as unknown as keyof HappyConfig]
		writeConfig(config)
		console.log(`✓ Removed ${key}`)
		process.exit(1)
	})

configCommand
	.command('reset')
	.description('Reset all configuration')
	.option('-y, --yes', 'Skip confirmation')
	.action(opts => {
		const doReset = () => {
			const configDir = join(homedir(), '.happy')
			const configFile = join(configDir, 'config.json')
			if (existsSync(configFile)) {
				fs.rmSync(configFile)
			}
			console.log('✓ Configuration reset.')
		}

		if (!opts.yes) {
			console.log(
				'This will delete all configuration including your API token.',
			)
			console.log(
				'Use --yes flag to confirm: happy-vibecode config reset --yes',
			)
			process.exit(1)
		} else {
			doReset()
		}
		process.exit(1)
	})

export {configCommand}
