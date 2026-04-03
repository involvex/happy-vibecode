import {z} from 'zod'

export interface StreamingCapabilities {
	supportsStreaming: boolean
	supportsThinking: boolean
	thinkingStartTag?: string
	thinkingEndTag?: string
	contextWindow: number
	streamingMode: 'chunks' | 'sse' | 'pty'
	toolCallIndicator?: string
	supportsInteractiveInput: boolean
}

export const providerCapabilities = {
	gemini: {
		maxTokens: 1_000_000,
		models: [
			'gemini-2.5-flash-preview-04-17',
			'gemini-2.5-flash',
			'gemini-2.0-flash-latest',
			'gemini-2.0-flash',
			'gemini-2.0-pro',
		],
		displayName: 'Google Gemini',
		description: 'High-context, multimodal AI',
		streaming: {
			supportsStreaming: true,
			supportsThinking: true,
			thinkingStartTag: '<think>',
			thinkingEndTag: '</think>',
			contextWindow: 1_000_000,
			streamingMode: 'pty' as const,
			supportsInteractiveInput: true,
		} satisfies StreamingCapabilities,
	},
	claude: {
		maxTokens: 200_000,
		models: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514'],
		displayName: 'Anthropic Claude',
		description: 'Strong reasoning and code generation',
		streaming: {
			supportsStreaming: true,
			supportsThinking: true,
			thinkingStartTag: '<thinking>',
			thinkingEndTag: '</thinking>',
			contextWindow: 200_000,
			streamingMode: 'pty' as const,
			supportsInteractiveInput: true,
		} satisfies StreamingCapabilities,
	},
	codex: {
		maxTokens: 128_000,
		models: ['o4-mini', 'codex-mini'],
		displayName: 'OpenAI Codex',
		description: 'Optimized for code generation',
		streaming: {
			supportsStreaming: true,
			supportsThinking: true,
			thinkingStartTag: '<think>',
			thinkingEndTag: '</think>',
			contextWindow: 128_000,
			streamingMode: 'pty' as const,
			toolCallIndicator: 'Tool:',
			supportsInteractiveInput: true,
		} satisfies StreamingCapabilities,
	},
	'opencode-ai': {
		maxTokens: 128_000,
		models: [
			'default',
			'anthropic/claude-sonnet-4-5',
			'openai/gpt-4o',
			'openai/gpt-4o-mini',
			'minimax/minimax-text-01',
			'deepseek/deepseek-r1-0528',
			'qwen/qwen3-30b-a3b',
		],
		displayName: 'OpenCode AI',
		description: 'Open-source coding agent',
		streaming: {
			supportsStreaming: true,
			supportsThinking: false,
			contextWindow: 128_000,
			streamingMode: 'sse' as const,
			supportsInteractiveInput: false,
		} satisfies StreamingCapabilities,
	},
	copilot: {
		maxTokens: 128_000,
		models: ['gpt-4o', 'gpt-4o-mini'],
		displayName: 'GitHub Copilot',
		description: 'Integrated code assistant',
		streaming: {
			supportsStreaming: true,
			supportsThinking: false,
			contextWindow: 128_000,
			streamingMode: 'pty' as const,
			supportsInteractiveInput: true,
		} satisfies StreamingCapabilities,
	},
	kilo: {
		maxTokens: 200_000,
		models: [
			'default',
			'kilo-auto/free',
			'claude-sonnet-4-5',
			'gpt-4o',
			'gpt-4o-mini',
		],
		displayName: 'Kilo',
		description: 'VS Code AI coding agent',
		streaming: {
			supportsStreaming: false,
			supportsThinking: false,
			contextWindow: 200_000,
			streamingMode: 'chunks' as const,
			supportsInteractiveInput: false,
		} satisfies StreamingCapabilities,
	},
	cline: {
		maxTokens: 128_000,
		models: ['default'],
		displayName: 'Cline',
		description: 'VS Code AI coding agent',
		streaming: {
			supportsStreaming: false,
			supportsThinking: false,
			contextWindow: 128_000,
			streamingMode: 'chunks' as const,
			supportsInteractiveInput: false,
		} satisfies StreamingCapabilities,
	},
	custom: {
		maxTokens: 128_000,
		models: ['default'],
		displayName: 'Custom Provider',
		description: 'User-defined custom agent',
		streaming: {
			supportsStreaming: false,
			supportsThinking: false,
			contextWindow: 128_000,
			streamingMode: 'chunks' as const,
			supportsInteractiveInput: false,
		} satisfies StreamingCapabilities,
	},
} as const

export type ProviderId = keyof typeof providerCapabilities

export const streamingCapabilitySchema = z.object({
	supportsStreaming: z.boolean(),
	supportsThinking: z.boolean(),
	thinkingStartTag: z.string().optional(),
	thinkingEndTag: z.string().optional(),
	contextWindow: z.number(),
	streamingMode: z.enum(['chunks', 'sse', 'pty']),
	toolCallIndicator: z.string().optional(),
	supportsInteractiveInput: z.boolean(),
})

export const providerCapabilitySchema = z.object({
	maxTokens: z.number(),
	models: z.array(z.string()),
	displayName: z.string(),
	description: z.string(),
	streaming: streamingCapabilitySchema.optional(),
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
