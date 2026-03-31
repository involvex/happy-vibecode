import {ensureOpencodeServer} from '../utils/opencode-server.js'
import {createOpencodeClient} from '@opencode-ai/sdk'
import {debug} from '../utils/log.js'
import {Command} from 'commander'

export const providersCommand = new Command('providers')
	.description('List available providers and models from the opencode server')
	.option('-p, --port <port>', 'opencode serve port', '4096')
	.option('-j, --json', 'Output raw JSON')
	.action(async opts => {
		const port = Number(opts.port)
		let server: Awaited<ReturnType<typeof ensureOpencodeServer>> | null = null

		try {
			server = await ensureOpencodeServer(port)
			debug('opencode server at', server.url)

			const client = createOpencodeClient({baseUrl: server.url})

			const {data, error} = await client.config.providers()
			if (error || !data) {
				console.error('Failed to fetch providers:', error ?? 'no data returned')
				process.exit(1)
			}

			if (opts.json) {
				console.log(JSON.stringify(data, null, 2))
				return
			}

			const providers = data.providers ?? []

			if (!providers.length) {
				console.log('No providers configured in opencode.')
				console.log('Run: opencode config  — to add a provider API key.')
				return
			}

			console.log('\nConfigured opencode providers:\n')
			for (const p of providers) {
				const modelIds = Object.keys(p.models ?? {})
				console.log(`  ${p.id}  (${p.name})  [${p.source}]`)
				for (const modelId of modelIds) {
					console.log(`    • ${modelId}`)
				}
			}
			console.log()
			console.log(
				'Use --model <providerID/modelID> with `happy connect` to select a model.',
			)
			console.log('Example: happy connect --model anthropic/claude-opus-4-5\n')
		} catch (err) {
			console.error('Error:', (err as Error).message)
			process.exit(1)
		} finally {
			server?.close()
		}
	})
