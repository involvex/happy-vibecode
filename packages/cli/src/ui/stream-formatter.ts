import process from 'node:process'

type ChalkInstance = typeof import('chalk').default

let _chalk: ChalkInstance | undefined
let _highlight:
	| ((code: string, opts?: Record<string, unknown>) => string)
	| undefined

async function getChalk(): Promise<ChalkInstance> {
	if (!_chalk) {
		const mod = await import('chalk')
		_chalk = mod.default
	}
	return _chalk
}

async function getHighlight() {
	if (!_highlight) {
		const mod = await import('cli-highlight')
		_highlight = mod.highlight
	}
	return _highlight
}

export interface StreamFormatterOptions {
	showThinking?: boolean
	noColor?: boolean
	isInteractive?: boolean
}

export class StreamFormatter {
	private opts: StreamFormatterOptions
	private buffer = ''
	private inThinking = false
	private thinkingBuffer = ''
	private inCodeBlock = false
	private codeBlockLang = ''
	private codeBlockBuffer = ''

	constructor(opts: StreamFormatterOptions = {}) {
		this.opts = {
			showThinking: opts.showThinking ?? false,
			noColor:
				opts.noColor ??
				(process.env.NO_COLOR !== undefined || !process.stdout.isTTY),
			isInteractive: opts.isInteractive ?? process.stdout.isTTY,
		}
	}

	async formatChunk(raw: string): Promise<string> {
		const chalk = await getChalk()
		this.buffer += raw
		let output = ''

		while (this.buffer.length > 0) {
			if (!this.inThinking && !this.inCodeBlock) {
				const thinkStart = this.buffer.indexOf('<thinking>')
				const codeStart = this.buffer.indexOf('```')

				if (thinkStart === 0) {
					this.inThinking = true
					this.buffer = this.buffer.slice('<thinking>'.length)
					continue
				}
				if (codeStart === 0) {
					const nlIdx = this.buffer.indexOf('\n', 3)
					if (nlIdx > 0) {
						this.codeBlockLang = this.buffer.slice(3, nlIdx).trim()
						this.buffer = this.buffer.slice(nlIdx + 1)
						this.inCodeBlock = true
						continue
					}
				}

				const nextSpecial =
					thinkStart >= 0 && codeStart >= 0
						? Math.min(thinkStart, codeStart)
						: thinkStart >= 0
							? thinkStart
							: codeStart >= 0
								? codeStart
								: -1

				if (nextSpecial > 0) {
					output += this.buffer.slice(0, nextSpecial)
					this.buffer = this.buffer.slice(nextSpecial)
				} else if (nextSpecial < 0) {
					output += this.buffer
					this.buffer = ''
				} else {
					break
				}
			} else if (this.inThinking) {
				const endIdx = this.buffer.indexOf('</thinking>')
				if (endIdx >= 0) {
					this.thinkingBuffer += this.buffer.slice(0, endIdx)
					const thinkText = this.thinkingBuffer.trim()
					this.thinkingBuffer = ''
					this.inThinking = false
					this.buffer = this.buffer.slice(endIdx + '</thinking>'.length)

					if (this.opts.showThinking && thinkText) {
						if (this.opts.noColor) {
							output += `[Thinking]\n${thinkText}\n[/Thinking]\n`
						} else {
							output +=
								chalk.dim.italic('\n╔═ Thinking ══════════════════\n') +
								chalk.dim.italic(thinkText) +
								chalk.dim.italic('\n╚════════════════════════════\n')
						}
					}
				} else {
					this.thinkingBuffer += this.buffer
					this.buffer = ''
				}
			} else if (this.inCodeBlock) {
				const endIdx = this.buffer.indexOf('```')
				if (endIdx >= 0) {
					this.codeBlockBuffer += this.buffer.slice(0, endIdx)
					const code = this.codeBlockBuffer
					const lang = this.codeBlockLang
					this.codeBlockBuffer = ''
					this.codeBlockLang = ''
					this.inCodeBlock = false
					this.buffer = this.buffer.slice(endIdx + 3)
					output += await this.renderCodeBlock(code, lang)
				} else {
					this.codeBlockBuffer += this.buffer
					this.buffer = ''
				}
			}
		}

		return this.applyInlineColors(output, chalk)
	}

	async flush(): Promise<string> {
		const chalk = await getChalk()
		const remaining = this.buffer
		this.buffer = ''
		return this.applyInlineColors(remaining, chalk)
	}

	private applyInlineColors(text: string, chalk: ChalkInstance): string {
		if (!text || this.opts.noColor) return text
		return text.replace(/^(>\s.*|Tool:\s.*)$/gm, line => chalk.cyan(line))
	}

	private async renderCodeBlock(code: string, lang: string): Promise<string> {
		if (this.opts.noColor) {
			return `\`\`\`${lang}\n${code}\n\`\`\`\n`
		}
		try {
			const highlight = await getHighlight()
			const chalk = await getChalk()
			const highlighted = highlight(code, {
				language: lang || undefined,
				ignoreIllegals: true,
			})
			const border = chalk.dim('─'.repeat(40))
			const header = lang ? chalk.dim.italic(`[${lang}]\n`) : ''
			return `\n${border}\n${header}${highlighted}\n${border}\n`
		} catch {
			return `\`\`\`${lang}\n${code}\n\`\`\`\n`
		}
	}

	static async formatError(msg: string): Promise<string> {
		if (!process.stdout.isTTY || process.env.NO_COLOR) return `ERROR: ${msg}`
		const chalk = await getChalk()
		return chalk.red.bold(`✗ ${msg}`)
	}

	static async formatStatus(msg: string): Promise<string> {
		if (!process.stdout.isTTY || process.env.NO_COLOR) return msg
		const chalk = await getChalk()
		return chalk.yellow(msg)
	}

	static async formatSuccess(msg: string): Promise<string> {
		if (!process.stdout.isTTY || process.env.NO_COLOR) return msg
		const chalk = await getChalk()
		return chalk.green(`✓ ${msg}`)
	}
}
