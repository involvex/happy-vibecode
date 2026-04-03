import type {ApiEnv} from '../middleware/auth.js'
import {Hono} from 'hono'

interface ModelEntry {
	id: string
	name?: string
	description?: string
	context_length?: number
	pricing?: {
		prompt?: string | number
		completion?: string | number
	}
}

export const modelsRouter = new Hono<{Bindings: ApiEnv}>()

// No auth required — public model discovery endpoints

modelsRouter.get('/opencode', async c => {
	try {
		const res = await fetch('https://opencode.ai/zen/v1/models', {
			headers: {Accept: 'application/json'},
			signal: AbortSignal.timeout(5000),
		})
		if (!res.ok) throw new Error(`HTTP ${res.status}`)
		const raw = (await res.json()) as {data?: ModelEntry[]} | ModelEntry[]
		const models: ModelEntry[] = Array.isArray(raw)
			? raw
			: ((raw as {data?: ModelEntry[]}).data ?? [])
		return c.json({models, fallback: false})
	} catch {
		return c.json({
			models: [
				{
					id: 'minimax/minimax-text-01-2.5-free',
					name: 'MiniMax Text 2.5 (Free)',
					pricing: {prompt: 0, completion: 0},
				},
				{id: 'anthropic/claude-sonnet-4-5', name: 'Claude Sonnet 4.5'},
				{id: 'anthropic/claude-opus-4-5', name: 'Claude Opus 4.5'},
				{id: 'openai/gpt-4o', name: 'GPT-4o'},
				{id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini'},
				{id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash'},
			] as ModelEntry[],
			fallback: true,
		})
	}
})

modelsRouter.get('/kilo', async c => {
	try {
		const res = await fetch('https://api.kilo.ai/api/gateway/models', {
			headers: {Accept: 'application/json'},
			signal: AbortSignal.timeout(5000),
		})
		if (!res.ok) throw new Error(`HTTP ${res.status}`)
		const raw = (await res.json()) as
			| {data?: ModelEntry[]; models?: ModelEntry[]}
			| ModelEntry[]
		const models: ModelEntry[] = Array.isArray(raw)
			? raw
			: ((raw as {data?: ModelEntry[]}).data ??
				(raw as {models?: ModelEntry[]}).models ??
				[])
		return c.json({models, fallback: false})
	} catch {
		return c.json({
			models: [
				{
					id: 'kilo-auto/free',
					name: 'Kilo Auto (Free)',
					pricing: {prompt: 0, completion: 0},
				},
				{id: 'anthropic/claude-sonnet-4-5', name: 'Claude Sonnet 4.5'},
				{id: 'openai/gpt-4o', name: 'GPT-4o'},
				{id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini'},
			] as ModelEntry[],
			fallback: true,
		})
	}
})
