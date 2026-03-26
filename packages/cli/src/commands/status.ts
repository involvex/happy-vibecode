import {requireConfig} from '../config.js'
import {Command} from 'commander'

interface HealthResponse {
	status: string
	timestamp: string
}

interface SessionsResponse {
	sessions: Array<{
		id: string
		agentType: string
		status: string
		createdAt: string
	}>
}

export const statusCommand = new Command('status')
	.description('Show connection status and active sessions')
	.action(async () => {
		const config = requireConfig()
		const {serverUrl, apiToken} = config

		// Ping health endpoint
		try {
			const res = await fetch(`${serverUrl}/api/health`)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = (await res.json()) as HealthResponse
			console.log(`✓ Server online — ${serverUrl}`)
			console.log(`  Status: ${data.status}  |  Time: ${data.timestamp}`)
		} catch (err) {
			console.error(`✗ Server unreachable at ${serverUrl}`)
			console.error(`  ${(err as Error).message}`)
			process.exit(1)
		}

		// List active sessions
		try {
			const res = await fetch(`${serverUrl}/api/sessions`, {
				headers: {Authorization: `Bearer ${apiToken}`},
			})
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = (await res.json()) as SessionsResponse
			const sessions = data.sessions ?? []
			if (sessions.length === 0) {
				console.log('\nNo active sessions.')
			} else {
				console.log(`\nActive sessions (${sessions.length}):`)
				for (const s of sessions) {
					const age = new Date(s.createdAt).toLocaleString()
					console.log(`  [${s.status}] ${s.agentType}  ${s.id}  (${age})`)
				}
			}
		} catch (err) {
			console.warn(`Could not fetch sessions: ${(err as Error).message}`)
		}
	})
