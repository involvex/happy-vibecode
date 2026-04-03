'use client'

import {
	ArrowsDownUpIcon,
	CheckIcon,
	GearSixIcon,
	SpinnerGapIcon,
	XIcon,
} from '@phosphor-icons/react'
import {useCallback, useEffect, useRef, useState} from 'react'

// ── Types ──────────────────────────────────────────────────────────────

interface ModelEntry {
	id: string
	name?: string
	description?: string
	context_length?: number
	pricing?: {
		prompt?: string | number
		completion?: string | number
	}
}

interface ProviderConfig {
	id: string
	label: string
	fetchUrl?: string
	staticModels?: ModelEntry[]
}

// ── Static provider definitions ───────────────────────────────────────

const PROVIDERS: ProviderConfig[] = [
	{
		id: 'opencode-ai',
		label: 'OpenCode',
		fetchUrl: '/api/models/opencode',
	},
	{
		id: 'kilo',
		label: 'Kilo',
		fetchUrl: '/api/models/kilo',
	},
	{
		id: 'gemini',
		label: 'Gemini',
		staticModels: [
			{
				id: 'gemini-2.5-flash-preview-05-20',
				name: 'Gemini 2.5 Flash Preview',
				pricing: {prompt: 0, completion: 0},
			},
			{id: 'gemini-2.5-flash-latest', name: 'Gemini 2.5 Flash'},
			{id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro'},
			{id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash'},
			{id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash'},
			{id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro'},
		],
	},
	{
		id: 'claude',
		label: 'Claude',
		staticModels: [
			{id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5'},
			{id: 'claude-opus-4-5', name: 'Claude Opus 4.5'},
			{id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet'},
			{id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku'},
		],
	},
	{
		id: 'codex',
		label: 'GPT / Codex',
		staticModels: [
			{id: 'gpt-4o', name: 'GPT-4o'},
			{id: 'gpt-4o-mini', name: 'GPT-4o Mini'},
			{id: 'o3', name: 'o3'},
			{id: 'o4-mini', name: 'o4-mini'},
		],
	},
	{
		id: 'copilot',
		label: 'Copilot',
		staticModels: [
			{id: 'gpt-4o', name: 'GPT-4o'},
			{id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5'},
			{id: 'o3', name: 'o3'},
		],
	},
]

// ── Helpers ────────────────────────────────────────────────────────────

const STORAGE_KEY = 'happy-model-settings'

type ModelSettings = Record<string, string>

function loadSettings(): ModelSettings {
	try {
		return JSON.parse(
			localStorage.getItem(STORAGE_KEY) ?? '{}',
		) as ModelSettings
	} catch {
		return {}
	}
}

function saveSettings(s: ModelSettings) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

function isFree(m: ModelEntry): boolean {
	if (!m.pricing) return false
	return (
		Number(m.pricing.prompt ?? 1) === 0 &&
		Number(m.pricing.completion ?? 1) === 0
	)
}

function fmtPrice(p: string | number | undefined): string {
	if (p === undefined || p === null) return '—'
	const n = Number(p)
	if (n === 0) return 'free'
	// Convert per-token price to per-million-token display
	if (n < 0.0001) return `$${(n * 1_000_000).toFixed(3)}/M`
	return `$${n.toFixed(4)}`
}

// ── Component ─────────────────────────────────────────────────────────

interface ModelSettingsModalProps {
	currentProvider?: string
	currentModel?: string
	onSwitch: (provider: string, model: string) => void
}

export function ModelSettingsModal({
	currentProvider,
	currentModel,
	onSwitch,
}: ModelSettingsModalProps) {
	const [open, setOpen] = useState(false)
	const [activeTab, setActiveTab] = useState(PROVIDERS[0].id)
	const [models, setModels] = useState<Record<string, ModelEntry[]>>({})
	const [loading, setLoading] = useState<Record<string, boolean>>({})
	const [settings, setSettings] = useState<ModelSettings>(loadSettings)
	const [sortByPrice, setSortByPrice] = useState(false)
	const [filter, setFilter] = useState('')
	const fetched = useRef(new Set<string>())

	// Pre-load static models on mount
	useEffect(() => {
		const initial: Record<string, ModelEntry[]> = {}
		for (const p of PROVIDERS) {
			if (p.staticModels) initial[p.id] = p.staticModels
		}
		setModels(initial)
	}, [])

	// Fetch dynamic models for the active tab
	const fetchTab = useCallback(async (providerId: string) => {
		const cfg = PROVIDERS.find(p => p.id === providerId)
		if (!cfg?.fetchUrl || fetched.current.has(providerId)) return
		fetched.current.add(providerId)
		setLoading(prev => ({...prev, [providerId]: true}))
		try {
			const res = await fetch(cfg.fetchUrl)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = (await res.json()) as {models: ModelEntry[]}
			setModels(prev => ({...prev, [providerId]: data.models}))
		} catch {
			// Keep static fallback
		} finally {
			setLoading(prev => ({...prev, [providerId]: false}))
		}
	}, [])

	useEffect(() => {
		if (open) fetchTab(activeTab)
	}, [open, activeTab, fetchTab])

	const handleSelect = useCallback(
		(providerId: string, modelId: string) => {
			const next = {...settings, [providerId]: modelId}
			setSettings(next)
			saveSettings(next)
			onSwitch(providerId, modelId)
		},
		[settings, onSwitch],
	)

	const cfg = PROVIDERS.find(p => p.id === activeTab)
	const allModels = models[activeTab] ?? cfg?.staticModels ?? []

	const displayed = (() => {
		const filtered = filter
			? allModels.filter(m =>
					(m.id + ' ' + (m.name ?? ''))
						.toLowerCase()
						.includes(filter.toLowerCase()),
				)
			: allModels
		if (!sortByPrice) return filtered
		return [...filtered].sort((a, b) => {
			const af = isFree(a)
			const bf = isFree(b)
			if (af && !bf) return -1
			if (!af && bf) return 1
			return Number(a.pricing?.prompt ?? 999) - Number(b.pricing?.prompt ?? 999)
		})
	})()

	const selectedForTab = settings[activeTab]

	return (
		<>
			{/* Gear trigger */}
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-kumo-line bg-kumo-base text-kumo-default hover:bg-kumo-control transition-colors"
				title="Configure models"
				aria-label="Open model settings"
			>
				<GearSixIcon size={14} />
				<span className="hidden sm:inline">Models</span>
			</button>

			{/* Overlay */}
			{open && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
					onClick={e => {
						if (e.target === e.currentTarget) setOpen(false)
					}}
				>
					<div className="relative w-full max-w-2xl max-h-[88vh] flex flex-col bg-kumo-base border border-kumo-line rounded-2xl shadow-2xl overflow-hidden">
						{/* Header */}
						<div className="flex items-center justify-between px-5 py-3.5 border-b border-kumo-line">
							<div className="flex items-center gap-2">
								<GearSixIcon size={16} className="text-kumo-inactive" />
								<span className="text-sm font-semibold text-kumo-default">
									Model Settings
								</span>
							</div>
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => setSortByPrice(v => !v)}
									className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
										sortByPrice
											? 'bg-blue-600 text-white'
											: 'bg-kumo-control text-kumo-subtle hover:text-kumo-default'
									}`}
								>
									<ArrowsDownUpIcon size={12} />
									Sort by price
								</button>
								<button
									type="button"
									onClick={() => setOpen(false)}
									className="p-1.5 rounded-lg text-kumo-inactive hover:text-kumo-default hover:bg-kumo-control transition-colors"
									aria-label="Close"
								>
									<XIcon size={15} />
								</button>
							</div>
						</div>

						{/* Provider tabs */}
						<div className="flex border-b border-kumo-line overflow-x-auto">
							{PROVIDERS.map(p => (
								<button
									type="button"
									key={p.id}
									onClick={() => {
										setActiveTab(p.id)
										setFilter('')
									}}
									className={`flex-shrink-0 flex items-center gap-1 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 ${
										activeTab === p.id
											? 'border-blue-500 text-kumo-default'
											: 'border-transparent text-kumo-subtle hover:text-kumo-default'
									}`}
								>
									{p.label}
									{settings[p.id] && (
										<span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
									)}
								</button>
							))}
						</div>

						{/* Search */}
						<div className="px-4 py-2 border-b border-kumo-line">
							<input
								type="text"
								value={filter}
								onChange={e => setFilter(e.target.value)}
								placeholder="Search models…"
								className="w-full px-3 py-1.5 text-xs bg-kumo-control border border-kumo-line rounded-lg text-kumo-default placeholder:text-kumo-inactive focus:outline-none focus:ring-2 focus:ring-blue-500/50"
							/>
						</div>

						{/* Model list */}
						<div className="flex-1 overflow-y-auto p-3">
							{loading[activeTab] ? (
								<div className="flex items-center justify-center gap-2 py-12 text-kumo-inactive">
									<SpinnerGapIcon size={18} className="animate-spin" />
									<span className="text-sm">Loading models…</span>
								</div>
							) : displayed.length === 0 ? (
								<div className="text-center py-12 text-kumo-inactive text-sm">
									No models found
								</div>
							) : (
								<div className="grid gap-1">
									{displayed.map(m => {
										const free = isFree(m)
										const isActive =
											selectedForTab === m.id ||
											(!selectedForTab &&
												activeTab === currentProvider &&
												m.id === currentModel)
										return (
											<button
												type="button"
												key={m.id}
												onClick={() => handleSelect(activeTab, m.id)}
												className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors ${
													isActive
														? 'bg-blue-500/10 border border-blue-500/30'
														: 'hover:bg-kumo-control border border-transparent'
												}`}
											>
												<div className="flex items-center gap-2 min-w-0">
													{isActive ? (
														<CheckIcon
															size={13}
															className="flex-shrink-0 text-blue-500"
														/>
													) : (
														<div className="w-[13px] flex-shrink-0" />
													)}
													<div className="min-w-0">
														<div className="flex items-center gap-1.5">
															<span className="text-xs font-medium text-kumo-default truncate">
																{m.name ?? m.id}
															</span>
															{free && (
																<span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
																	FREE
																</span>
															)}
														</div>
														<span className="text-[10px] text-kumo-inactive block truncate">
															{m.id}
														</span>
													</div>
												</div>

												{m.pricing && (
													<div className="flex-shrink-0 text-right ml-4">
														{free ? (
															<span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
																Free
															</span>
														) : (
															<div className="text-[10px] text-kumo-inactive leading-tight">
																<div>{fmtPrice(m.pricing.prompt)} in</div>
																<div>{fmtPrice(m.pricing.completion)} out</div>
															</div>
														)}
													</div>
												)}
											</button>
										)
									})}
								</div>
							)}
						</div>

						{/* Footer */}
						<div className="px-5 py-2.5 border-t border-kumo-line flex items-center justify-between">
							<span className="text-xs text-kumo-inactive">
								{selectedForTab ? (
									<>
										Active:{' '}
										<span className="text-kumo-default font-mono">
											{selectedForTab}
										</span>
									</>
								) : (
									'No model selected for this provider'
								)}
							</span>
							<button
								type="button"
								onClick={() => setOpen(false)}
								className="px-3 py-1.5 text-xs rounded-lg border border-kumo-line bg-kumo-base text-kumo-default hover:bg-kumo-control transition-colors"
							>
								Done
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	)
}
