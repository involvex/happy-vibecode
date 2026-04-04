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
			'gemini-2.5-pro',
			'gemini-2.5-flash',
			'gemini-2.5-flash-lite',
			'gemini-2.5-flash-preview-04-17',
			'gemini-2.0-flash-latest',
			'gemini-2.0-flash',
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
		models: [
			'claude-opus-4-20250514',
			'claude-sonnet-4-20250514',
			'claude-3-7-sonnet-20250219',
			'claude-3-5-sonnet-20241022',
			'claude-3-5-haiku-20241022',
		],
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
		maxTokens: 1_000_000,
		models: [
			'claude-opus-4-6',
			'claude-sonnet-4-6',
			'claude-sonnet-4',
			'claude-3-5-haiku',
			'gemini-3.1-pro',
			'gemini-3-pro',
			'gemini-3-flash',
			'gpt-5.4',
			'gpt-5.4-pro',
			'gpt-5.4-mini',
			'gpt-5.3-codex',
			'gpt-5.2',
			'gpt-5.1-codex',
			'gpt-5',
			'kimi-k2.5',
			'kimi-k2',
			'minimax-m2.5',
			'big-pickle',
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
		models: [
			'claude-opus-4-6',
			'claude-sonnet-4-6',
			'claude-opus-4-20250514',
			'claude-sonnet-4-20250514',
			'claude-3-7-sonnet-20250219',
			'claude-3-5-sonnet-20241022',
			'claude-3-5-haiku-20241022',
			'gemini-2.5-pro',
			'gemini-2.5-flash',
			'gpt-5.4',
			'gpt-5.4-mini',
			'gpt-4.1',
			'gpt-4o',
			'o3',
			'o4-mini',
		],
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
		maxTokens: 1_000_000,
		models: [
			'kilo-auto/frontier',
			'kilo-auto/balanced',
			'kilo-auto/free',
			'anthropic/claude-opus-4.6',
			'anthropic/claude-sonnet-4.6',
			'anthropic/claude-3-7-sonnet-20250219',
			'anthropic/claude-3-5-haiku-20241022',
			'google/gemini-2.5-pro',
			'google/gemini-2.5-flash',
			'openai/gpt-5.4',
			'openai/gpt-5.4-mini',
			'openai/o3',
			'openai/o4-mini',
			'deepseek/deepseek-r1',
			'deepseek/deepseek-v3',
			'x-ai/grok-code-fast-1:optimized:free',
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
		models: [],
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
		models: [],
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
