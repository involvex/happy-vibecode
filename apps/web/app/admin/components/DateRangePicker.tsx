'use client'

interface DateRangePickerProps {
	startDate: string
	endDate: string
	onStartDateChange: (date: string) => void
	onEndDateChange: (date: string) => void
}

export function DateRangePicker({
	startDate,
	endDate,
	onStartDateChange,
	onEndDateChange,
}: DateRangePickerProps) {
	return (
		<div className="flex items-center gap-3">
			<div>
				<label htmlFor="start-date" className="sr-only">
					Start Date
				</label>
				<input
					id="start-date"
					type="date"
					value={startDate}
					onChange={e => onStartDateChange(e.target.value)}
					className="px-3 py-1.5 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default text-sm focus:outline-none focus:ring-2 focus:ring-kumo-ring"
				/>
			</div>
			<span className="text-kumo-inactive text-sm">to</span>
			<div>
				<label htmlFor="end-date" className="sr-only">
					End Date
				</label>
				<input
					id="end-date"
					type="date"
					value={endDate}
					onChange={e => onEndDateChange(e.target.value)}
					className="px-3 py-1.5 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default text-sm focus:outline-none focus:ring-2 focus:ring-kumo-ring"
				/>
			</div>
		</div>
	)
}
