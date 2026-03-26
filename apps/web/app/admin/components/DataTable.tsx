'use client'
import {
	CaretLeftIcon,
	CaretRightIcon,
	CaretDoubleLeftIcon,
	CaretDoubleRightIcon,
} from '@phosphor-icons/react'

interface DataTableColumn<T> {
	key: string
	header: string
	render: (item: T) => React.ReactNode
	className?: string
}

interface DataTableProps<T> {
	columns: DataTableColumn<T>[]
	data: T[]
	total: number
	page: number
	pageSize: number
	onPageChange: (page: number) => void
	loading?: boolean
	emptyMessage?: string
	keyExtractor: (item: T) => string
	onRowClick?: (item: T) => void
}

export function DataTable<T>({
	columns,
	data,
	total,
	page,
	pageSize,
	onPageChange,
	loading,
	emptyMessage = 'No data found',
	keyExtractor,
	onRowClick,
}: DataTableProps<T>) {
	const totalPages = Math.max(1, Math.ceil(total / pageSize))
	const start = total === 0 ? 0 : (page - 1) * pageSize + 1
	const end = Math.min(page * pageSize, total)

	return (
		<div className="bg-kumo-base border border-kumo-line rounded-2xl overflow-hidden">
			<div className="overflow-x-auto">
				<table className="w-full">
					<thead>
						<tr className="border-b border-kumo-line bg-kumo-control/30">
							{columns.map(col => (
								<th
									key={col.key}
									className={`px-4 py-3 text-left text-xs font-semibold text-kumo-secondary uppercase tracking-wider ${col.className ?? ''}`}
								>
									{col.header}
								</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-kumo-line">
						{loading ? (
							Array.from({length: 5}).map((_, i) => (
								<tr key={i}>
									{columns.map(col => (
										<td key={col.key} className="px-4 py-3">
											<div className="h-4 bg-kumo-control rounded animate-pulse w-24" />
										</td>
									))}
								</tr>
							))
						) : data.length === 0 ? (
							<tr>
								<td
									colSpan={columns.length}
									className="px-4 py-12 text-center text-kumo-inactive"
								>
									{emptyMessage}
								</td>
							</tr>
						) : (
							data.map(item => (
								<tr
									key={keyExtractor(item)}
									className={`hover:bg-kumo-hover/50 transition-colors ${
										onRowClick ? 'cursor-pointer' : ''
									}`}
									onClick={() => onRowClick?.(item)}
								>
									{columns.map(col => (
										<td
											key={col.key}
											className={`px-4 py-3 text-sm text-kumo-default ${col.className ?? ''}`}
										>
											{col.render(item)}
										</td>
									))}
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

			{/* Pagination */}
			{!loading && total > 0 && (
				<div className="flex items-center justify-between px-4 py-3 border-t border-kumo-line">
					<p className="text-sm text-kumo-secondary">
						Showing {start} to {end} of {total}
					</p>
					<div className="flex items-center gap-1">
						<button
							type="button"
							onClick={() => onPageChange(1)}
							disabled={page <= 1}
							className="p-1.5 rounded-lg text-kumo-secondary hover:text-kumo-default hover:bg-kumo-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
						>
							<CaretDoubleLeftIcon size={14} />
						</button>
						<button
							type="button"
							onClick={() => onPageChange(page - 1)}
							disabled={page <= 1}
							className="p-1.5 rounded-lg text-kumo-secondary hover:text-kumo-default hover:bg-kumo-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
						>
							<CaretLeftIcon size={14} />
						</button>
						<span className="px-3 text-sm text-kumo-default">
							{page} / {totalPages}
						</span>
						<button
							type="button"
							onClick={() => onPageChange(page + 1)}
							disabled={page >= totalPages}
							className="p-1.5 rounded-lg text-kumo-secondary hover:text-kumo-default hover:bg-kumo-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
						>
							<CaretRightIcon size={14} />
						</button>
						<button
							type="button"
							onClick={() => onPageChange(totalPages)}
							disabled={page >= totalPages}
							className="p-1.5 rounded-lg text-kumo-secondary hover:text-kumo-default hover:bg-kumo-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
						>
							<CaretDoubleRightIcon size={14} />
						</button>
					</div>
				</div>
			)}
		</div>
	)
}
