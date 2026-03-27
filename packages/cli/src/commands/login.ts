import {DEFAULT_SERVER_URL, writeConfig} from '../config.js'
import {debug, debugTime} from '../utils/log.js'
import {createInterface} from 'readline'
import {Command} from 'commander'

async function prompt(question: string, hidden = false): Promise<string> {
	const rl = createInterface({input: process.stdin, output: process.stdout})
	return new Promise(resolve => {
		if (hidden) process.stdout.write(question)
		rl.question(hidden ? '' : question, answer => {
			if (hidden) process.stdout.write('\n')
			rl.close()
			resolve(answer.trim())
		})
		if (hidden) {
			// Turn off echo for password-style input
			;(process.stdin as NodeJS.ReadStream).setRawMode?.(true)
			process.stdin.once('data', data => {
				;(process.stdin as NodeJS.ReadStream).setRawMode?.(false)
				const token = data.toString().trim()
				process.stdout.write('\n')
				rl.close()
				resolve(token)
			})
		}
	})
}

export const loginCommand = new Command('login')
	.description('Authenticate with your Happy Vibecode API token')
	.option('-s, --server <url>', 'Server URL', DEFAULT_SERVER_URL)
	.action(async opts => {
		const serverUrl: string = opts.server

		debug('Server URL:', serverUrl)
		console.log('Happy Vibecode — Login')
		console.log(`Server: ${serverUrl}\n`)

		const email = await prompt('Email (for new accounts) or leave blank: ')
		// eslint-disable-next-line no-useless-assignment
		let token = ''

		if (email) {
			// Register a new account
			debug('Registering with email:', email)
			console.log('Registering new account...')
			const done = debugTime('POST /api/auth/register')
			const res = await fetch(`${serverUrl}/api/auth/register`, {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({email}),
			})
			done()
			if (!res.ok) {
				const err = await res.text()
				debug('Registration failed:', res.status, err)
				console.error(`Registration failed: ${err}`)
				process.exit(1)
			}
			const data = (await res.json()) as {
				apiToken: string
				id: string
			}
			token = data.apiToken
			debug('Registered, userId:', data.id)
			console.log(`\nRegistered! Your API token:\n  ${token}`)
			console.log("Keep this safe — it won't be shown again.\n")
			writeConfig({apiToken: token, serverUrl, userId: data.id})
			console.log('✓ Logged in and config saved to ~/.happy/config.json')
		} else {
			// Login with existing token
			token = await prompt('API token: ')
			if (!token) {
				console.error('Token is required.')
				process.exit(1)
			}

			// Verify the token
			debug('Verifying token...')
			const done = debugTime('POST /api/auth/verify')
			const res = await fetch(`${serverUrl}/api/auth/verify`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			})
			done()
			if (!res.ok) {
				debug('Token verification failed:', res.status)
				console.error('Invalid token. Please check and try again.')
				process.exit(1)
			}
			const data = (await res.json()) as {valid: boolean; userId: string}
			debug('Token verified, userId:', data.userId)
			writeConfig({apiToken: token, serverUrl, userId: data.userId})
			console.log('✓ Token verified and saved to ~/.happy/config.json')
		}
	})
