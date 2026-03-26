import {handleImageOptimization} from 'vinext/server/image-optimization'
import {handleGithubCallback, handleGithubLogin} from './github-oauth'
import handler from 'vinext/server/app-router-entry'
import {api} from '@happy-vibecode/api'

export {BridgeAgent} from './bridge-agent'

interface Env {
	ASSETS: Fetcher
	DB: D1Database
	KV: KVNamespace
	BridgeAgent: DurableObjectNamespace
	GITHUB_CLIENT_ID: string
	GITHUB_CLIENT_SECRET: string
	IMAGES: {
		input(stream: ReadableStream): {
			transform(options: Record<string, unknown>): {
				output(options: {
					format: string
					quality: number
				}): Promise<{response(): Response}>
			}
		}
	}
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url)

		// Image optimization via Cloudflare Images binding
		if (url.pathname === '/_vinext/image') {
			return handleImageOptimization(request, {
				fetchAsset: path =>
					env.ASSETS.fetch(new Request(new URL(path, request.url))),
				transformImage: async (body, {width, format, quality}) => {
					const result = await env.IMAGES.input(body)
						.transform(width > 0 ? {width} : {})
						.output({format, quality})
					return result.response()
				},
			})
		}

		// GitHub OAuth
		if (url.pathname === '/oauth/github') {
			return handleGithubLogin(env)
		}
		if (url.pathname === '/oauth/callback') {
			return handleGithubCallback(request, env)
		}

		// Mount Hono API at /api/*
		if (url.pathname.startsWith('/api/')) {
			return api.fetch(request, env)
		}

		// Route BridgeAgent WebSocket connections: /agents/BridgeAgent/<roomId>
		if (url.pathname.startsWith('/agents/BridgeAgent/')) {
			const roomId =
				url.pathname.slice('/agents/BridgeAgent/'.length) || 'default'
			const id = env.BridgeAgent.idFromName(roomId)
			const stub = env.BridgeAgent.get(id)
			return stub.fetch(request)
		}

		// Delegate everything else to vinext
		return handler.fetch(request)
	},
}
