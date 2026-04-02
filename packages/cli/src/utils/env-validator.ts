import {existsSync, readFileSync} from 'node:fs'

export interface EnvKeySpec {
	key: string
	required: boolean
	description: string
	pattern?: RegExp
	example: string
}

export const ENV_KEYS: EnvKeySpec[] = [
	{
		key: 'AUTH_GITHUB_ID',
		required: true,
		description: 'GitHub OAuth App Client ID',
		example: 'Ov23liOufGcx2MYgoM0v',
	},
	{
		key: 'AUTH_GITHUB_SECRET',
		required: true,
		description: 'GitHub OAuth App Client Secret',
		example: 'a1b2c3d4e5f6...',
	},
	{
		key: 'BETTER_AUTH_SECRET',
		required: true,
		description: 'Better Auth JWT secret (min 32 chars)',
		pattern: /.{32,}/,
		example: 'run: openssl rand -hex 32',
	},
	{
		key: 'BETTER_AUTH_URL',
		required: false,
		description: 'Public URL for Better Auth callbacks',
		example: 'https://happy-vibecode.example.com',
	},
	{
		key: 'CLOUDFLARE_ACCOUNT_ID',
		required: false,
		description: 'Cloudflare Account ID (32 hex chars)',
		pattern: /^[a-f0-9]{32}$/,
		example: 'a1b2c3d4e5f6...',
	},
	{
		key: 'CLOUDFLARE_API_TOKEN',
		required: false,
		description: 'Cloudflare API Token with Worker/D1/KV access',
		example: 'your-cloudflare-api-token',
	},
	{
		key: 'STRIPE_SECRET_KEY',
		required: false,
		description: 'Stripe Secret Key (sk_test_ or sk_live_)',
		pattern: /^sk_(test|live)_/,
		example: 'sk_test_xxx',
	},
	{
		key: 'STRIPE_WEBHOOK_SECRET',
		required: false,
		description: 'Stripe Webhook Signing Secret (whsec_...)',
		pattern: /^whsec_/,
		example: 'whsec_xxx',
	},
	{
		key: 'STRIPE_PRICE_ID',
		required: false,
		description: 'Stripe Price ID for subscription tier',
		pattern: /^price_/,
		example: 'price_xxx',
	},
	{
		key: 'TURNSTILE_SECRET_KEY',
		required: false,
		description: 'Cloudflare Turnstile challenge secret',
		example: '0x4AAAA...',
	},
]

export interface ValidationResult {
	key: string
	present: boolean
	valid: boolean
	error?: string
	description: string
}

export function validateEnvFile(envPath: string): ValidationResult[] {
	if (!existsSync(envPath)) {
		return ENV_KEYS.map(spec => ({
			key: spec.key,
			present: false,
			valid: !spec.required,
			error: spec.required ? `.env file not found at ${envPath}` : undefined,
			description: spec.description,
		}))
	}

	const content = readFileSync(envPath, 'utf8')
	const envMap = parseEnvFile(content)

	return ENV_KEYS.map(spec => {
		const value = envMap.get(spec.key)
		if (!value) {
			return {
				key: spec.key,
				present: false,
				valid: !spec.required,
				error: spec.required ? 'Required key is missing' : undefined,
				description: spec.description,
			}
		}
		const patternOk = !spec.pattern || spec.pattern.test(value)
		return {
			key: spec.key,
			present: true,
			valid: patternOk,
			error: !patternOk ? 'Value format is invalid' : undefined,
			description: spec.description,
		}
	})
}

export function parseEnvFile(content: string): Map<string, string> {
	const map = new Map<string, string>()
	for (const line of content.split('\n')) {
		const trimmed = line.trim()
		if (!trimmed || trimmed.startsWith('#')) continue
		const eqIdx = trimmed.indexOf('=')
		if (eqIdx < 0) continue
		const key = trimmed.slice(0, eqIdx).trim()
		const val = trimmed
			.slice(eqIdx + 1)
			.trim()
			.replace(/^["']|["']$/g, '')
		if (key) map.set(key, val)
	}
	return map
}

export function envFileToString(values: Map<string, string>): string {
	const lines: string[] = []
	for (const spec of ENV_KEYS) {
		lines.push(`# ${spec.description}`)
		const val = values.get(spec.key) ?? ''
		lines.push(`${spec.key}=${val}`)
		lines.push('')
	}
	return lines.join('\n')
}
