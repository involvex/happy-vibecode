'use client'

interface StatCardProps {
	icon: React.ReactNode
	label: string
	value: number | string
	subValue?: string
	color?: string
}

export function StatCard({icon, label, value, subValue, color}: StatCardProps) {
	return (
		<div className="bg-kumo-base border border-kumo-line rounded-2xl px-5 py-4 flex items-center gap-4">
			<div className={color ?? 'text-kumo-accent'}>{icon}</div>
			<div>
				<p className="text-2xl font-bold text-kumo-default">{value}</p>
				<p className="text-xs text-kumo-secondary">{label}</p>
				{subValue && <p className="text-xs text-kumo-inactive">{subValue}</p>}
			</div>
		</div>
	)
}
