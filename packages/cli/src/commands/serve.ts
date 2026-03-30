import {
	startOpencodeServer,
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
			const info = await startOpencodeServer(port)
			spinner.succeed(`opencode serve running at ${info.url}`)

			if (info.process) {
				console.log('  Press Ctrl+C to stop the server.\n')

				process.on('SIGINT', () => {
					debug('SIGINT received, stopping opencode serve')
					info.process?.kill()
					process.exit(0)
				})

				// Keep the process alive
				await new Promise<void>(resolve => {
					info.process?.on('close', () => resolve())
				})
			} else {
				console.log('  (server was already running)')
			}
		} catch (err) {
			spinner.fail(`Failed to start opencode serve: ${(err as Error).message}`)
			process.exit(1)
		}
	})
