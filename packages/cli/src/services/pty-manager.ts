import {execSync} from 'node:child_process'
import {EventEmitter} from 'node:events'
import {existsSync} from 'node:fs'
import os from 'node:os'

export interface PtyOptions {
	command: string
	args?: string[]
	cwd?: string
	env?: NodeJS.ProcessEnv
	cols?: number
	rows?: number
}

export class PtyManager extends EventEmitter {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private pty?: any
	private _dead = false

	async spawn(opts: PtyOptions): Promise<void> {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let nodePty: any
		try {
			nodePty = await import('node-pty')
		} catch {
			throw new Error(
				'node-pty is not installed. Run: bun add node-pty in packages/cli',
			)
		}

		const cols = opts.cols ?? process.stdout.columns ?? 80
		const rows = opts.rows ?? process.stdout.rows ?? 24
		const isWindows = os.platform() === 'win32'
		const resolvedCmd = this.resolveCommand(opts.command)

		const spawnOpts: Record<string, unknown> = {
			cols,
			rows,
			cwd: opts.cwd ?? process.cwd(),
			env: opts.env ?? process.env,
			name: 'xterm-color',
		}
		if (isWindows) {
			spawnOpts.useConpty = true
		}

		this.pty = nodePty.spawn(resolvedCmd, opts.args ?? [], spawnOpts)

		this.pty.onData((data: string) => {
			this.emit('data', data)
		})

		this.pty.onExit(
			({exitCode, signal}: {exitCode: number; signal?: number}) => {
				this._dead = true
				this.emit('exit', exitCode, signal?.toString())
			},
		)

		if (!isWindows) {
			process.on('SIGWINCH', () => {
				if (this.pty && !this._dead) {
					this.pty.resize(
						process.stdout.columns ?? 80,
						process.stdout.rows ?? 24,
					)
				}
			})
		}
	}

	write(data: string): void {
		if (this.pty && !this._dead) {
			this.pty.write(data)
		}
	}

	resize(cols: number, rows: number): void {
		if (this.pty && !this._dead) {
			this.pty.resize(cols, rows)
		}
	}

	kill(signal?: string): void {
		if (this.pty && !this._dead) {
			try {
				this.pty.kill(signal ?? 'SIGTERM')
			} catch {
				// best-effort
			}
			this._dead = true
		}
	}

	get isDead(): boolean {
		return this._dead
	}

	private resolveCommand(cmd: string): string {
		if (os.platform() !== 'win32') return cmd
		try {
			const result = execSync(`where.exe "${cmd}.cmd" 2>nul`, {
				encoding: 'utf8',
				stdio: ['pipe', 'pipe', 'pipe'],
				timeout: 3000,
			})
				.trim()
				.split('\n')[0]
				?.trim()
			if (result && existsSync(result)) return result
		} catch {
			// fall through
		}
		try {
			const result = execSync(`where.exe "${cmd}" 2>nul`, {
				encoding: 'utf8',
				stdio: ['pipe', 'pipe', 'pipe'],
				timeout: 3000,
			})
				.trim()
				.split('\n')[0]
				?.trim()
			if (result && existsSync(result)) return result
		} catch {
			// fall through
		}
		return cmd
	}
}
