import {spawn, type ChildProcess} from 'child_process'
import {debug} from './log.js'

const DEFAULT_PORT = 4096
const HEALTH_CHECK_RETRIES = 20
const HEALTH_CHECK_INTERVAL_MS = 500

export interface OpencodeServerInfo {
	url: string
	port: number
	process: ChildProcess | null
}

function getHealthUrl(port: number): string {
	return `http://127.0.0.1:${port}/global/health`
}

async function checkHealth(port: number): Promise<boolean> {
	try {
		const res = await fetch(getHealthUrl(port), {
			signal: AbortSignal.timeout(2000),
		})
		return res.ok
	} catch {
		return false
	}
}

export async function isOpencodeRunning(
	port: number = DEFAULT_PORT,
): Promise<boolean> {
	return checkHealth(port)
}

export async function startOpencodeServer(
	port: number = DEFAULT_PORT,
): Promise<OpencodeServerInfo> {
	const url = `http://127.0.0.1:${port}`

	// Check if already running
	if (await checkHealth(port)) {
		debug('opencode serve already running on port', port)
		return {url, port, process: null}
	}

	debug('Starting opencode serve on port', port)

	const proc = spawn('opencode', ['serve', '--port', String(port)], {
		stdio: ['ignore', 'pipe', 'pipe'],
		shell: process.platform === 'win32',
		windowsHide: true,
	})

	// Forward opencode stderr to our stderr for debugging
	proc.stderr?.setEncoding('utf8')
	proc.stderr?.on('data', (chunk: string) => {
		debug('opencode serve:', chunk.trim())
	})

	proc.on('error', err => {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
			throw new Error(
				'opencode binary not found. Install it with: npm install -g opencode-ai',
			)
		}
		throw err
	})

	// Wait for health check to pass
	for (let i = 0; i < HEALTH_CHECK_RETRIES; i++) {
		await sleep(HEALTH_CHECK_INTERVAL_MS)
		if (await checkHealth(port)) {
			debug('opencode serve is healthy on port', port)
			return {url, port, process: proc}
		}
	}

	// Timeout — kill the process
	proc.kill()
	throw new Error(
		`opencode serve did not become healthy on port ${port} within ${HEALTH_CHECK_RETRIES * HEALTH_CHECK_INTERVAL_MS}ms`,
	)
}

export async function ensureOpencodeServer(
	port: number = DEFAULT_PORT,
): Promise<OpencodeServerInfo> {
	// Try existing server first
	if (await checkHealth(port)) {
		return {url: `http://127.0.0.1:${port}`, port, process: null}
	}

	return startOpencodeServer(port)
}

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms))
}
