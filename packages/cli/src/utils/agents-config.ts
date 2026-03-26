import type {AgentsConfig} from '../types/llm-provider.js'

// const AGENTS_FILE = join(HAPPY_DIR, 'agents.json')
export const DEFAULT_AGENTS: AgentsConfig = {
	agents: [
		{
			id: 'gemini',
			name: 'Gemini CLI',
			command: 'gemini',
			args: [],
			promptFlag: '-p',
			workspaceFlag: '--dir',
			description: 'Google Gemini CLI agent',
		},
		{
			id: 'claude',
			name: 'Claude Code',
			command: 'claude',
			args: [],
			promptFlag: '-p',
			workspaceFlag: '--dir',
			modelFlag: '-m',
			description: 'Anthropic Claude CLI agent',
		},
		{
			id: 'codex',
			name: 'OpenAI Codex',
			command: 'codex',
			args: [],
			promptFlag: '-p',
			description: 'OpenAI Codex CLI agent',
		},
		{
			id: 'opencode-ai',
			name: 'OpenCode AI',
			command: 'opencode',
			args: ['run'],
			promptFlag: '--prompt',
			description: 'OpenCode AI CLI agent',
		},
		{
			id: 'copilot',
			name: 'GitHub Copilot',
			command: 'copilot',
			args: [],
			promptFlag: '-p',
			description: 'GitHub Copilot CLI agent',
		},
	],
	workspaces: [],
}
