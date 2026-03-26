'use client'
import {DownloadIcon, FileCsvIcon, FilePdfIcon} from '@phosphor-icons/react'
import {useState} from 'react'

interface ExportButtonProps {
	onExportCSV: () => void
	onExportPDF: () => void
}

export function ExportButton({onExportCSV, onExportPDF}: ExportButtonProps) {
	const [open, setOpen] = useState(false)

	return (
		<div className="relative">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-kumo-line text-sm text-kumo-secondary hover:text-kumo-default hover:bg-kumo-hover transition-colors"
			>
				<DownloadIcon size={14} />
				Export
			</button>
			{open && (
				<>
					<div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
					<div className="absolute right-0 top-full mt-1 bg-kumo-base border border-kumo-line rounded-lg shadow-lg z-50 w-36 py-1">
						<button
							type="button"
							onClick={() => {
								onExportCSV()
								setOpen(false)
							}}
							className="w-full flex items-center gap-2 px-3 py-2 text-sm text-kumo-secondary hover:text-kumo-default hover:bg-kumo-hover transition-colors"
						>
							<FileCsvIcon size={14} />
							CSV
						</button>
						<button
							type="button"
							onClick={() => {
								onExportPDF()
								setOpen(false)
							}}
							className="w-full flex items-center gap-2 px-3 py-2 text-sm text-kumo-secondary hover:text-kumo-default hover:bg-kumo-hover transition-colors"
						>
							<FilePdfIcon size={14} />
							PDF
						</button>
					</div>
				</>
			)}
		</div>
	)
}

export function exportToCSV(data: Record<string, unknown>[], filename: string) {
	if (data.length === 0) return
	const headers = Object.keys(data[0])
	const csv = [
		headers.join(','),
		...data.map(row =>
			headers
				.map(h => {
					const val = row[h]
					const str = val == null ? '' : String(val)
					return str.includes(',') || str.includes('"')
						? `"${str.replace(/"/g, '""')}"`
						: str
				})
				.join(','),
		),
	].join('\n')

	const blob = new Blob([csv], {type: 'text/csv'})
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = `${filename}.csv`
	a.click()
	URL.revokeObjectURL(url)
}

export function exportToPDF(title: string, data: Record<string, unknown>[]) {
	if (data.length === 0) return
	const headers = Object.keys(data[0])

	const html = `<!DOCTYPE html>
<html><head><title>${title}</title>
<style>
body{font-family:sans-serif;padding:20px}
h1{font-size:18px;margin-bottom:16px}
table{width:100%;border-collapse:collapse;font-size:12px}
th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
th{background:#f5f5f5;font-weight:600}
</style></head><body>
<h1>${title}</h1>
<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
<tbody>${data.map(row => `<tr>${headers.map(h => `<td>${row[h] ?? ''}</td>`).join('')}</tr>`).join('')}</tbody>
</table>
</body></html>`

	const blob = new Blob([html], {type: 'text/html'})
	const url = URL.createObjectURL(blob)
	const w = window.open(url)
	if (w) {
		w.onload = () => {
			w.print()
		}
	}
	setTimeout(() => URL.revokeObjectURL(url), 1000)
}
