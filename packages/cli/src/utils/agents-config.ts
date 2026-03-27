import type {AgentsConfig} from '../types/llm-provider.js'
import {PROVIDER_CONFIGS} from '../types/llm-provider.js'

const {
	gemini,
	claude,
	codex,
	'opencode-ai': opencodeAi,
	copilot,
	kilo,
	cline,
} = PROVIDER_CONFIGS

// DEFAULT_AGENTS derives from PROVIDER_CONFIGS — single source of truth
export const DEFAULT_AGENTS: AgentsConfig = {
	agents: [
		{...gemini, args: []},
		{...claude, args: []},
		{...codex, args: []},
		{...opencodeAi, args: []},
		{...copilot, args: []},
		{...kilo, args: []},
		{...cline, args: []},
	],
	workspaces: [],
}
