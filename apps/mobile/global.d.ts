export {}

declare global {
	interface Crypto {
		randomUUID(): string
	}

	var crypto: Crypto
}
