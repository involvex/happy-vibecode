import {z} from 'zod'

export const providerCapabilities = {
	gemini: {
		maxTokens: 1_000_000,
		models: ['gemini-2.0-flash', 'gemini-2.0-pro', 'gemini-2.5-flash'],
		displayName: 'Google Gemini',
		description: 'High-context, multimodal AI',
	},
	claude: {
		maxTokens: 200_000,
		models: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514'],
		displayName: 'Anthropic Claude',
		description: 'Strong reasoning and code generation',
	},
	codex: {
		maxTokens: 128_000,
		models: ['o4-mini', 'codex-mini'],
		displayName: 'OpenAI Codex',
		description: 'Optimized for code generation',
	},
	'opencode-ai': {
		maxTokens: 128_000,
		models: ['default'],
		displayName: 'OpenCode AI',
		description: 'Open-source coding agent',
	},
	copilot: {
		maxTokens: 128_000,
		models: ['gpt-4o', 'gpt-4o-mini'],
		displayName: 'GitHub Copilot',
		description: 'Integrated code assistant',
	},
	kilo: {
		maxTokens: 200_000,
		models: ['default'],
		displayName: 'Kilo',
		description: 'VS Code AI coding agent',
	},
	cline: {
		maxTokens: 128_000,
		models: ['default'],
		displayName: 'Cline',
		description: 'VS Code AI coding agent',
	},
	custom: {
		maxTokens: 128_000,
		models: ['default'],
		displayName: 'Custom Provider',
		description: 'User-defined custom agent',
	},
} as const

export type ProviderId = keyof typeof providerCapabilities

export const providerCapabilitySchema = z.object({
	maxTokens: z.number(),
	models: z.array(z.string()),
	displayName: z.string(),
	description: z.string(),
})

export const providerConfigSchema = z.object({
	provider: z.enum([
		'gemini',
		'claude',
		'codex',
		'opencode-ai',
		'copilot',
		'kilo',
		'cline',
		'custom',
	]),
	model: z.string().optional(),
})

export type ProviderConfig = z.infer<typeof providerConfigSchema>

export function getProviderModels(provider: string): readonly string[] {
	return providerCapabilities[provider as ProviderId]?.models ?? []
}

export function getProviderDisplayName(provider: string): string {
	return providerCapabilities[provider as ProviderId]?.displayName ?? provider
}
