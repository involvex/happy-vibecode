'use client'

import {providerCapabilities} from '@happy-vibecode/shared'
import {CaretDownIcon} from '@phosphor-icons/react'
import {useCallback, useState} from 'react'

interface ModelSelectorProps {
	currentProvider?: string
	currentModel?: string
	onSwitch: (provider: string, model: string) => void
	disabled?: boolean
}

export function ModelSelector({
	currentProvider,
	currentModel,
	onSwitch,
	disabled,
}: ModelSelectorProps) {
	const [isOpen, setIsOpen] = useState(false)

	const handleSelect = useCallback(
		(provider: string, model: string) => {
			onSwitch(provider, model)
			setIsOpen(false)
		},
		[onSwitch],
	)

	const currentDisplay = currentProvider
		? `${providerCapabilities[currentProvider as keyof typeof providerCapabilities]?.displayName ?? currentProvider}: ${currentModel ?? 'default'}`
		: 'Select model'

	return (
		<div className="relative">
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				disabled={disabled}
				className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-kumo-line bg-kumo-base text-kumo-default hover:bg-kumo-control transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				title="Switch LLM model"
			>
				<span className="max-w-[180px] truncate">{currentDisplay}</span>
				<CaretDownIcon
					size={12}
					className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
				/>
			</button>

			{isOpen && (
				<>
					<button
						type="button"
						className="fixed inset-0 z-40 cursor-default"
						onClick={() => setIsOpen(false)}
						aria-label="Close model selector"
						tabIndex={-1}
					/>
					<div className="absolute right-0 top-full mt-1 z-50 w-64 max-h-80 overflow-y-auto bg-kumo-base border border-kumo-line rounded-xl shadow-lg">
						{Object.entries(providerCapabilities).map(([providerId, caps]) => (
							<div key={providerId}>
								<div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-kumo-inactive bg-kumo-control/50">
									{caps.displayName}
								</div>
								{caps.models.map(model => {
									const isActive =
										currentProvider === providerId && currentModel === model
									return (
										<button
											type="button"
											key={`${providerId}:${model}`}
											onClick={() => handleSelect(providerId, model)}
											className={`w-full text-left px-3 py-2 text-xs hover:bg-kumo-control transition-colors ${
												isActive
													? 'text-kumo-contrast font-medium bg-kumo-control'
													: 'text-kumo-default'
											}`}
										>
											<span className="block truncate">{model}</span>
											<span className="block text-[10px] text-kumo-inactive">
												{caps.description}
											</span>
										</button>
									)
								})}
							</div>
						))}
					</div>
				</>
			)}
		</div>
	)
}
