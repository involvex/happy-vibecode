import {
	ensureOpencodeServer,
	isOpencodeRunning,
} from '../utils/opencode-server.js'
import {debug} from '../utils/log.js'
import {Command} from 'commander'
import ora from 'ora'

export const serveCommand = new Command('serve')
	.description('Start the opencode server backend (required for vibe connect)')
	.option('-p, --port <port>', 'Port to listen on', '4096')
	.option('-h, --hostname <hostname>', 'Hostname to listen on', '127.0.0.1')
	.action(async opts => {
		const port = parseInt(opts.port, 10)
		const hostname = opts.hostname

		if (await isOpencodeRunning(port)) {
			console.log(
				`✓ opencode serve is already running on http://${hostname}:${port}`,
			)
			process.exit(0)
		}

		const spinner = ora(`Starting opencode serve on port ${port}...`).start()

		try {
			const info = await ensureOpencodeServer(port)
			spinner.succeed(`opencode serve running at ${info.url}`)
			console.log('  Press Ctrl+C to stop the server.\n')

			const cleanup = () => {
				debug('Stopping opencode serve')
				info.close()
				process.exit(0)
			}
			process.on('SIGINT', cleanup)
			process.on('SIGTERM', cleanup)

			// Keep the CLI alive until the server exits or user presses Ctrl+C
			await new Promise<void>(resolve => {
				// We don't have direct access to the child process exit here, so
				// we rely on SIGINT/SIGTERM. For the manual spawn path the process
				// will keep going; for the SDK path the server object handles it.
				setTimeout(resolve, 2_147_483_647) // ~24 days — effectively "forever"
			})
		} catch (err) {
			spinner.fail(`Failed to start opencode serve: ${(err as Error).message}`)
			process.exit(1)
		}
	})
