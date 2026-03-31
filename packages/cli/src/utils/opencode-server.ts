import {debug} from './log.js'

const DEFAULT_PORT = 4096
const HEALTH_CHECK_TIMEOUT_MS = 2000
const SDK_START_TIMEOUT_MS = 15_000
const MANUAL_RETRIES = 30
const MANUAL_RETRY_INTERVAL_MS = 500

export interface OpencodeServerInfo {
	url: string
	port: number
	/** Stops the server process if we started it; no-op if it was already running */
	close: () => void
}

function getHealthUrl(port: number): string {
	return `http://127.0.0.1:${port}/global/health`
}

async function checkHealth(port: number): Promise<boolean> {
	try {
		const res = await fetch(getHealthUrl(port), {
			signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
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

/**
 * Ensures opencode serve is running. Resolution order:
 * 1. Already running at port → attach (no-op close)
 * 2. SDK createOpencodeServer → managed spawn with proper ready detection
 * 3. Manual spawn + health poll fallback (for SDK compatibility issues)
 */
export async function ensureOpencodeServer(
	port: number = DEFAULT_PORT,
	options?: {cors?: string},
): Promise<OpencodeServerInfo> {
	const url = `http://127.0.0.1:${port}`

	// Fast path: server already running (user started manually, or previous session)
	if (await checkHealth(port)) {
		debug('opencode serve already running on port', port)
		return {url, port, close: () => {}}
	}

	debug('Starting opencode serve on port', port)

	// Primary: use SDK's createOpencodeServer for clean process management
	// Note: SDK spawn does not support --cors; CORS is only passed in the manual fallback
	try {
		const {createOpencodeServer} = await import('@opencode-ai/sdk/server')
		debug('Using SDK createOpencodeServer')
		const server = await createOpencodeServer({
			port,
			timeout: SDK_START_TIMEOUT_MS,
		})
		debug('opencode serve started via SDK at', server.url)
		return {url: server.url, port, close: server.close}
	} catch (sdkErr) {
		debug(
			'SDK createOpencodeServer failed, falling back to manual spawn:',
			(sdkErr as Error).message,
		)
	}

	// Fallback: manual spawn + health poll (handles older SDK versions or binary issues)
	return startOpencodeServerManual(port, options?.cors)
}

async function startOpencodeServerManual(
	port: number,
	corsOrigins?: string,
): Promise<OpencodeServerInfo> {
	const {spawn} = await import('child_process')
	const url = `http://127.0.0.1:${port}`

	const args = ['serve', '--port', String(port)]
	if (corsOrigins) {
		args.push('--cors', corsOrigins)
	}

	const proc = spawn('opencode', args, {
		stdio: ['ignore', 'pipe', 'pipe'],
		shell: process.platform === 'win32',
		windowsHide: true,
	})

	proc.stderr?.setEncoding('utf8')
	proc.stderr?.on('data', (chunk: string) => {
		debug('opencode serve:', chunk.trim())
	})

	proc.on('error', err => {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
			throw new Error(
				'opencode binary not found. Install it with: bun add -g opencode-ai',
			)
		}
		throw err
	})

	for (let i = 0; i < MANUAL_RETRIES; i++) {
		await sleep(MANUAL_RETRY_INTERVAL_MS)
		if (await checkHealth(port)) {
			debug('opencode serve is healthy on port', port)
			return {url, port, close: () => proc.kill()}
		}
	}

	proc.kill()
	throw new Error(
		`opencode serve did not become healthy on port ${port} within ${MANUAL_RETRIES * MANUAL_RETRY_INTERVAL_MS}ms`,
	)
}

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms))
}
