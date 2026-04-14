'use client'

export function SkeletonTable({
	rows = 5,
	cols = 6,
}: {
	rows?: number
	cols?: number
}) {
	return (
		<div className="bg-kumo-base border border-kumo-line rounded-2xl overflow-hidden">
			<table className="w-full">
				<thead>
					<tr className="border-b border-kumo-line">
						{Array.from({length: cols}).map((_, i) => (
							<th
								key={i}
								className="px-4 py-3"
							>
								<div className="h-3 bg-kumo-control rounded animate-pulse w-20" />
							</th>
						))}
					</tr>
				</thead>
				<tbody className="divide-y divide-kumo-line">
					{Array.from({length: rows}).map((_, ri) => (
						<tr key={ri}>
							{Array.from({length: cols}).map((_, ci) => (
								<td
									key={ci}
									className="px-4 py-3"
								>
									<div
										className="h-4 bg-kumo-control rounded animate-pulse"
										style={{width: `${40 + Math.random() * 60}%`}}
									/>
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}

export function SkeletonCards({count = 4}: {count?: number}) {
	return (
		<div
			className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(count, 4)} gap-4`}
		>
			{Array.from({length: count}).map((_, i) => (
				<div
					key={i}
					className="bg-kumo-base border border-kumo-line rounded-2xl p-5 space-y-3"
				>
					<div className="h-3 bg-kumo-control rounded animate-pulse w-20" />
					<div className="h-8 bg-kumo-control rounded animate-pulse w-32" />
				</div>
			))}
		</div>
	)
}

export function SkeletonChart() {
	return (
		<div className="bg-kumo-base border border-kumo-line rounded-2xl p-6 space-y-4">
			<div className="h-4 bg-kumo-control rounded animate-pulse w-40" />
			<div className="h-64 bg-kumo-control/50 rounded animate-pulse" />
		</div>
	)
}
