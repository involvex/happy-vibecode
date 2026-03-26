const SALT_LENGTH = 16
const ITERATIONS = 100000
const HASH_LENGTH = 32
const ALGORITHM = 'SHA-256'

function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer)
	let binary = ''
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]!)
	}
	return btoa(binary)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
	const binary = atob(base64)
	const bytes = new Uint8Array(binary.length)
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i)
	}
	return bytes.buffer
}

export async function hashPassword(password: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
	const encoder = new TextEncoder()
	const passwordBuffer = encoder.encode(password)

	const keyMaterial = await crypto.subtle.importKey(
		'raw',
		passwordBuffer,
		{name: 'PBKDF2'},
		false,
		['deriveBits'],
	)

	const derivedBits = await crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			salt,
			iterations: ITERATIONS,
			hash: ALGORITHM,
		},
		keyMaterial,
		HASH_LENGTH * 8,
	)

	const saltBase64 = arrayBufferToBase64(salt.buffer)
	const hashBase64 = arrayBufferToBase64(derivedBits)

	return `${saltBase64}:${hashBase64}`
}

export async function verifyPassword(
	password: string,
	storedHash: string,
): Promise<boolean> {
	const [saltBase64, hashBase64] = storedHash.split(':')
	if (!saltBase64 || !hashBase64) {
		return false
	}

	const encoder = new TextEncoder()
	const passwordBuffer = encoder.encode(password)

	const salt = new Uint8Array(base64ToArrayBuffer(saltBase64))

	const keyMaterial = await crypto.subtle.importKey(
		'raw',
		passwordBuffer,
		{name: 'PBKDF2'},
		false,
		['deriveBits'],
	)

	const derivedBits = await crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			salt,
			iterations: ITERATIONS,
			hash: ALGORITHM,
		},
		keyMaterial,
		HASH_LENGTH * 8,
	)

	const computedHashBase64 = arrayBufferToBase64(derivedBits)

	return computedHashBase64 === hashBase64
}
