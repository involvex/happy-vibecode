import {readConfig} from '../config.js'
import {Command} from 'commander'

type ExportFormat = 'markdown' | 'json' | 'html'

interface SessionMessage {
	role: 'user' | 'assistant'
	content: string
	timestamp?: string
}

async function fetchMessages(
	sessionId: string,
	serverUrl: string,
	apiToken: string,
): Promise<SessionMessage[]> {
	const res = await fetch(`${serverUrl}/api/sessions/${sessionId}/messages`, {
		headers: {Authorization: `Bearer ${apiToken}`},
	})
	if (!res.ok) {
		throw new Error(`Failed to fetch session: ${res.status} ${res.statusText}`)
	}
	return res.json() as Promise<SessionMessage[]>
}

function toMarkdown(sessionId: string, messages: SessionMessage[]): string {
	const lines: string[] = [`# Session: ${sessionId}`, '']
	for (const msg of messages) {
		const prefix = msg.role === 'user' ? '**User**' : '**Assistant**'
		const ts = msg.timestamp ? ` _(${msg.timestamp})_` : ''
		lines.push(`### ${prefix}${ts}`, '')
		lines.push(msg.content, '')
	}
	return lines.join('\n')
}

function toHtml(sessionId: string, messages: SessionMessage[]): string {
	const rows = messages
		.map(m => {
			const cls = m.role === 'user' ? 'user' : 'assistant'
			const escaped = m.content
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/\n/g, '<br>')
			return `<div class="msg ${cls}"><strong>${m.role}</strong><p>${escaped}</p></div>`
		})
		.join('\n')

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Session ${sessionId}</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;background:#0d1117;color:#c9d1d9}
  .msg{padding:12px 16px;border-radius:8px;margin:12px 0}
  .user{background:#161b22;border-left:3px solid #388bfd}
  .assistant{background:#1a2330;border-left:3px solid #3fb950}
  strong{font-size:.75rem;text-transform:uppercase;opacity:.6;letter-spacing:.05em}
  p{margin:6px 0 0}
</style>
</head>
<body>
<h1>Session: ${sessionId}</h1>
${rows}
</body>
</html>`
}

export const exportCommand = new Command('export')
	.description('Export a session to markdown, JSON, or HTML')
	.argument('<sessionId>', 'Session ID to export')
	.option(
		'-f, --format <fmt>',
		'Output format: markdown | json | html',
		'markdown',
	)
	.option('-o, --output <path>', 'Write to file instead of stdout')
	.action(async (sessionId: string, opts) => {
		const config = readConfig()
		if (!config?.apiToken || !config.serverUrl) {
			console.error('Not logged in. Run: happy login')
			process.exit(1)
		}

		const format = (opts.format ?? 'markdown') as ExportFormat
		if (!['markdown', 'json', 'html'].includes(format)) {
			console.error(`Unknown format "${format}". Use: markdown | json | html`)
			process.exit(1)
		}

		let messages: SessionMessage[]
		try {
			messages = await fetchMessages(
				sessionId,
				config.serverUrl,
				config.apiToken,
			)
		} catch (err) {
			console.error(`Error: ${(err as Error).message}`)
			process.exit(1)
		}

		let output: string
		switch (format) {
			case 'json':
				output = JSON.stringify(messages, null, 2)
				break
			case 'html':
				output = toHtml(sessionId, messages)
				break
			default:
				output = toMarkdown(sessionId, messages)
		}

		if (opts.output) {
			const {writeFileSync} = await import('node:fs')
			writeFileSync(opts.output, output, 'utf8')
			console.log(`✓ Exported to ${opts.output}`)
		} else {
			process.stdout.write(output + '\n')
		}
	})
