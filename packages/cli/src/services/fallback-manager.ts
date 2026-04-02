interface ProviderConfig {
	provider: string
	model?: string
}

export interface FallbackChainEntry {
	provider: string
	model?: string
}

export interface FallbackResult {
	entry: FallbackChainEntry
	attemptIndex: number
	error?: Error
}

export type FallbackEventType =
	| 'fallback_triggered'
	| 'fallback_exhausted'
	| 'attempt_start'

export interface FallbackEvent {
	type: FallbackEventType
	chain: FallbackChainEntry[]
	currentIndex: number
	reason?: string
}

export type FallbackEventHandler = (event: FallbackEvent) => void

const BASE_DELAY_MS = 1000
const MAX_DELAY_MS = 16_000

function calcDelay(attempt: number): number {
	return Math.min(BASE_DELAY_MS * Math.pow(2, attempt), MAX_DELAY_MS)
}

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms))
}

export class FallbackManager {
	private chain: FallbackChainEntry[]
	private handlers: FallbackEventHandler[] = []

	constructor(chain: FallbackChainEntry[]) {
		if (chain.length === 0)
			throw new Error('Fallback chain must have at least one entry')
		this.chain = chain
	}

	on(handler: FallbackEventHandler): () => void {
		this.handlers.push(handler)
		return () => {
			this.handlers = this.handlers.filter(h => h !== handler)
		}
	}

	private emit(event: FallbackEvent): void {
		for (const h of this.handlers) h(event)
	}

	async execute<T>(
		fn: (entry: FallbackChainEntry, index: number) => Promise<T>,
	): Promise<T> {
		let lastError: Error | undefined

		for (let i = 0; i < this.chain.length; i++) {
			const entry = this.chain[i]!

			this.emit({type: 'attempt_start', chain: this.chain, currentIndex: i})

			try {
				return await fn(entry, i)
			} catch (err) {
				lastError = err instanceof Error ? err : new Error(String(err))

				if (i < this.chain.length - 1) {
					const delay = calcDelay(i)
					this.emit({
						type: 'fallback_triggered',
						chain: this.chain,
						currentIndex: i,
						reason: lastError.message,
					})
					await sleep(delay)
				}
			}
		}

		this.emit({
			type: 'fallback_exhausted',
			chain: this.chain,
			currentIndex: this.chain.length - 1,
			reason: lastError?.message,
		})

		throw lastError ?? new Error('All fallback providers exhausted')
	}

	static fromProviderConfigs(configs: ProviderConfig[]): FallbackManager {
		return new FallbackManager(
			configs.map(c => ({provider: c.provider, model: c.model})),
		)
	}
}
