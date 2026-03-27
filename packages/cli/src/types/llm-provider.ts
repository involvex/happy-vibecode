import type {
	LLMProvider as SharedLLMProvider,
	AgentConfig,
} from '@happy-vibecode/shared'

export type LLMProvider = SharedLLMProvider

export type {AgentConfig}

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

export type AgentDefinition = AgentConfig

export const PROVIDER_CONFIGS: Record<LLMProvider, AgentDefinition> = {
	gemini: {
		id: 'gemini',
		name: 'Gemini CLI',
		provider: 'gemini',
		command: 'gemini',
		args: [],
		promptFlag: '-p',
		description: 'Google Gemini CLI agent',
	},
	claude: {
		id: 'claude',
		name: 'Claude Code',
		provider: 'claude',
		command: 'claude',
		args: [],
		promptFlag: '-p',
		modelFlag: '-m',
		description: 'Anthropic Claude CLI agent',
	},
	codex: {
		id: 'codex',
		name: 'OpenAI Codex',
		provider: 'codex',
		command: 'codex',
		args: [],
		promptFlag: '-p',
		description: 'OpenAI Codex CLI agent',
	},
	'opencode-ai': {
		id: 'opencode-ai',
		name: 'OpenCode AI',
		provider: 'opencode-ai',
		command: 'opencode',
		args: [],
		promptFlag: '--prompt',
		description: 'OpenCode AI CLI agent',
	},
	copilot: {
		id: 'copilot',
		name: 'GitHub Copilot',
		provider: 'copilot',
		command: 'copilot',
		args: [],
		promptFlag: '-p',
		description: 'GitHub Copilot CLI agent',
	},
	kilo: {
		id: 'kilo',
		name: 'Kilocode Cli',
		provider: 'kilo',
		command: 'kilo',
		args: [],
		promptFlag: '--prompt',
		description:
			'Kilocode VS Code extension — dispatches tasks but AI response goes to VS Code UI, not stdout',
	},
	cline: {
		id: 'cline',
		name: 'Cline CLI',
		provider: 'cline',
		command: 'cline',
		args: [],
		promptFlag: '-p',
		description:
			'Cline VS Code extension — dispatches tasks but AI response goes to VS Code UI, not stdout',
	},
	custom: {
		id: 'custom',
		name: 'Custom Agent',
		provider: 'custom',
		command: '',
		args: [],
		promptFlag: '',
		description: 'Custom agent configuration',
	},
}
