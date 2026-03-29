interface FetchRetryOptions {
	maxRetries?: number
	timeoutMs?: number
	retryDelayMs?: number
	retryOn?: number[]
}

export async function fetchWithRetry(
	url: string | URL,
	init: RequestInit = {},
	options: FetchRetryOptions = {},
): Promise<Response> {
	const {
		maxRetries = 3,
		timeoutMs = 10_000,
		retryDelayMs = 1000,
		retryOn = [408, 429, 500, 502, 503, 504],
	} = options

	let lastError: Error | undefined

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

			const response = await fetch(url, {
				...init,
				signal: controller.signal,
			})

			clearTimeout(timeoutId)

			if (response.ok || !retryOn.includes(response.status)) {
				return response
			}

			// Respect Retry-After header
			const retryAfter = response.headers.get('Retry-After')
			const delay = retryAfter
				? Number.parseInt(retryAfter, 10) * 1000
				: retryDelayMs * 2 ** attempt

			if (attempt < maxRetries) {
				await new Promise(resolve => setTimeout(resolve, delay))
				continue
			}

			return response
		} catch (err) {
			lastError = err as Error
			if (attempt < maxRetries) {
				const delay = retryDelayMs * 2 ** attempt
				await new Promise(resolve => setTimeout(resolve, delay))
				continue
			}
		}
	}

	throw lastError ?? new Error('fetchWithRetry: max retries exceeded')
}
