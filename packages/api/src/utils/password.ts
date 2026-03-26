const ITERATIONS = 100_000
const KEY_LENGTH = 32
const SALT_LENGTH = 16
const HASH_FORMAT = 'pbkdf2-sha256'

function toHex(buffer: ArrayBuffer): string {
	return Array.from(new Uint8Array(buffer))
		.map(b => b.toString(16).padStart(2, '0'))
		.join('')
}

function fromHex(hex: string): Uint8Array {
	const bytes = new Uint8Array(hex.length / 2)
	for (let i = 0; i < hex.length; i += 2) {
		bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
	}
	return bytes
}

export async function hashPassword(password: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
	const encoder = new TextEncoder()
	const passwordKey = await crypto.subtle.importKey(
		'raw',
		encoder.encode(password),
		'PBKDF2',
		false,
		['deriveBits'],
	)
	const derivedBits = await crypto.subtle.deriveBits(
		{name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256'},
		passwordKey,
		KEY_LENGTH * 8,
	)
	return `${HASH_FORMAT}:${ITERATIONS}:${toHex(salt.buffer)}:${toHex(derivedBits)}`
}

export async function verifyPassword(
	password: string,
	hash: string,
): Promise<boolean> {
	const parts = hash.split(':')
	if (parts.length !== 4 || parts[0] !== HASH_FORMAT) return false

	const iterations = parseInt(parts[1]!, 10)
	const saltHex = parts[2]!
	const hashHex = parts[3]!
	const salt = fromHex(saltHex)
	const storedHash = fromHex(hashHex)

	const encoder = new TextEncoder()
	const passwordKey = await crypto.subtle.importKey(
		'raw',
		encoder.encode(password),
		'PBKDF2',
		false,
		['deriveBits'],
	)
	const saltBuffer = new Uint8Array(salt).buffer as ArrayBuffer
	const derivedBits = await crypto.subtle.deriveBits(
		{name: 'PBKDF2', salt: saltBuffer, iterations, hash: 'SHA-256'},
		passwordKey,
		KEY_LENGTH * 8,
	)

	const derived = new Uint8Array(derivedBits)
	if (derived.length !== storedHash.length) return false
	let result = 0
	for (let i = 0; i < derived.length; i++) {
		result |= derived[i]! ^ storedHash[i]!
	}
	return result === 0
}
