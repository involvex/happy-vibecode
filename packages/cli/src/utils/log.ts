let _debug = false

export function setDebug(flag: boolean): void {
	_debug = flag
}

export function isDebug(): boolean {
	return _debug
}

function timestamp(): string {
	return new Date().toISOString().slice(11, 23)
}

export function debug(...args: unknown[]): void {
	if (!_debug) return
	console.log(`[${timestamp()}] DEBUG:`, ...args)
}

export function debugTime(label: string): () => void {
	if (!_debug) return () => {}
	const start = performance.now()
	return () => {
		const ms = Math.round(performance.now() - start)
		console.log(`[${timestamp()}] DEBUG: ${label} (${ms}ms)`)
	}
}

export async function debugFetch(
	url: string | URL | Request,
	init?: RequestInit,
): Promise<Response> {
	if (!_debug) return fetch(url, init)

	const method = init?.method ?? 'GET'
	const u =
		typeof url === 'string'
			? url
			: url instanceof URL
				? url.toString()
				: url.url
	const path =
		new URL(u, 'https://placeholder').pathname +
		new URL(u, 'https://placeholder').search
	const done = debugTime(`${method} ${path}`)

	try {
		const res = await fetch(url, init)
		done()
		debug(`${method} ${path} → ${res.status}`)
		return res
	} catch (err) {
		done()
		debug(`${method} ${path} → ERROR: ${(err as Error).message}`)
		throw err
	}
}
