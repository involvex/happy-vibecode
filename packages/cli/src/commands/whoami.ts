import {readConfig} from '../config.js'
import {Command} from 'commander'

interface VerifyResponse {
	userId: string
	valid: boolean
}

function maskToken(token: string): string {
	if (token.length <= 12) return '•'.repeat(token.length)
	return `${token.slice(0, 8)}${'•'.repeat(Math.min(token.length - 12, 16))}${token.slice(-4)}`
}

export const whoamiCommand = new Command('whoami')
	.description('Show current auth status and account information')
	.option('--verify', 'Verify token against the server')
	.action(async (opts: {verify?: boolean}) => {
		const config = readConfig()

		if (!config?.apiToken) {
			console.log('Not logged in.')
			console.log('  Run: happy login')
			process.exit(1)
		}

		const {apiToken, userId, serverUrl} = config

		console.log('Logged in')
		console.log(`  Server:   ${serverUrl}`)
		if (userId) console.log(`  User ID:  ${userId}`)
		console.log(`  Token:    ${maskToken(apiToken)}`)

		if (!opts.verify) return

		// Optionally verify the token is still valid
		try {
			const res = await fetch(`${serverUrl}/api/auth/verify`, {
				headers: {Authorization: `Bearer ${apiToken}`},
			})
			if (!res.ok) {
				console.log(
					'\n  ✗ Token is invalid or expired (HTTP ' + res.status + ')',
				)
				process.exit(1)
			}
			const data = (await res.json()) as VerifyResponse
			if (data.userId) console.log(`  ✓ Token verified — user: ${data.userId}`)
			else console.log('  ✓ Token verified')
		} catch (err) {
			console.warn(`\n  Could not reach server: ${(err as Error).message}`)
		}
		process.exit(1)
	})
