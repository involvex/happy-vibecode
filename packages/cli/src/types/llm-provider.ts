export type LLMProvider =
	| 'gemini'
	| 'claude'
	| 'codex'
	| 'opencode-ai'
	| 'copilot'
	| 'kilo'
	| 'cline'
	| 'custom'

export interface LLMProviderConfig {
	id: LLMProvider | string
	name: string
	command: string
	args: string[]
	promptFlag: string
	interactiveFlag?: string
	workspaceFlag?: string
	description: string
	supportsStreaming: boolean
	modelFlag?: string
}

export interface WorkspaceConfig {
	id: string
	name: string
	path: string
	defaultProvider?: string
	defaultModel?: string
	isActive?: boolean
}

export interface AgentsConfig {
	agents: AgentDefinition[]
	workspaces?: WorkspaceConfig[]
}

export interface AgentDefinition {
	id: string
	name: string
	command: string
	args: string[]
	description: string
	promptFlag?: string
	interactiveFlag?: string
	workspaceFlag?: string
	modelFlag?: string
}

export const PROVIDER_CONFIGS: Record<LLMProvider, LLMProviderConfig> = {
	gemini: {
		id: 'gemini',
		name: 'Gemini CLI',
		command: 'gemini',
		args: [],
		promptFlag: '-p',
		workspaceFlag: '--dir',
		description: 'Google Gemini CLI agent',
		supportsStreaming: true,
	},
	claude: {
		id: 'claude',
		name: 'Claude Code',
		command: 'claude',
		args: [],
		promptFlag: '--instructions',
		workspaceFlag: '--dir',
		description: 'Anthropic Claude CLI agent',
		supportsStreaming: true,
		modelFlag: '-m',
	},
	codex: {
		id: 'codex',
		name: 'OpenAI Codex',
		command: 'codex',
		args: [],
		promptFlag: '-p',
		description: 'OpenAI Codex CLI agent',
		supportsStreaming: true,
	},
	'opencode-ai': {
		id: 'opencode-ai',
		name: 'OpenCode AI',
		command: 'opencode',
		args: [],
		promptFlag: '-p',
		workspaceFlag: '-d',
		description: 'OpenCode AI CLI agent',
		supportsStreaming: true,
	},
	copilot: {
		id: 'copilot',
		name: 'GitHub Copilot',
		command: 'copilot',
		args: ['ai', 'submit'],
		promptFlag: '--description',
		description: 'GitHub Copilot CLI agent',
		supportsStreaming: false,
	},
	kilo: {
		id: 'kilo',
		name: 'Kilocode Cli',
		command: 'kilo',
		args: [],
		promptFlag: '--prompt',
		description: 'Kilocode CLI agent',
		supportsStreaming: true,
		workspaceFlag: '',
	},
	cline: {
		id: 'cline',
		name: 'Cline CLI',
		command: 'cline',
		args: [],
		promptFlag: '',
		description: 'Cline CLI agent',
		supportsStreaming: true,
	},
	custom: {
		id: 'custom',
		name: 'Custom Agent',
		command: '',
		args: [],
		promptFlag: '',
		description: 'Custom agent configuration',
		supportsStreaming: true,
	},
}
