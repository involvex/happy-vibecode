'use client'
import {
	CopyIcon,
	EyeIcon,
	GlobeIcon,
	LockIcon,
	PencilIcon,
	PlayIcon,
	PlusIcon,
	TrashIcon,
} from '@phosphor-icons/react'
import {useCallback, useEffect, useState} from 'react'
import {Button, Text} from '@cloudflare/kumo'
import {useRouter} from 'next/navigation'
import {useAuth} from '../hooks/useAuth'
import {Nav} from '../components/Nav'
import Link from 'next/link'

interface Template {
	id: string
	userId: string
	name: string
	description: string | null
	tags: string
	isPublic: number | boolean
	latestVersionId: string | null
	createdAt: string
	updatedAt: string
}

function parseTags(tags: string): string[] {
	try {
		const parsed = JSON.parse(tags)
		return Array.isArray(parsed) ? parsed : []
	} catch {
		return []
	}
}

export default function TemplatesPage() {
	const {apiToken, isLoaded, logout} = useAuth()
	const router = useRouter()
	const [templates, setTemplates] = useState<Template[]>([])
	const [loading, setLoading] = useState(true)
	const [filter, setFilter] = useState<'all' | 'me' | 'public'>('all')
	const [search, setSearch] = useState('')

	const fetchTemplates = useCallback(async () => {
		if (!apiToken) return
		setLoading(true)
		try {
			const res = await fetch(`/api/templates?owner=${filter}`, {
				headers: {Authorization: `Bearer ${apiToken}`},
			})
			if (res.ok) {
				const data = (await res.json()) as {templates: Template[]}
				setTemplates(data.templates)
			}
		} catch {
			// ignore
		} finally {
			setLoading(false)
		}
	}, [apiToken, filter])

	useEffect(() => {
		if (isLoaded && apiToken) fetchTemplates()
	}, [isLoaded, apiToken, fetchTemplates])

	const handleInstantiate = async (id: string) => {
		try {
			const res = await fetch(`/api/templates/${id}/instantiate`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${apiToken}`,
				},
			})
			if (res.ok) {
				router.push(`/chat`)
			}
		} catch {
			// ignore
		}
	}

	const handleTogglePublic = async (id: string, isPublic: boolean) => {
		try {
			await fetch(`/api/templates/${id}/share`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${apiToken}`,
				},
				body: JSON.stringify({isPublic: !isPublic}),
			})
			fetchTemplates()
		} catch {
			// ignore
		}
	}

	const handleDuplicate = async (id: string) => {
		try {
			await fetch(`/api/templates/${id}/duplicate`, {
				method: 'POST',
				headers: {Authorization: `Bearer ${apiToken}`},
			})
			fetchTemplates()
		} catch {
			// ignore
		}
	}

	const handleDelete = async (id: string) => {
		if (!confirm('Delete this template? This cannot be undone.')) return
		try {
			await fetch(`/api/templates/${id}`, {
				method: 'DELETE',
				headers: {Authorization: `Bearer ${apiToken}`},
			})
			setTemplates(prev => prev.filter(t => t.id !== id))
		} catch {
			// ignore
		}
	}

	const filtered = templates.filter(
		t =>
			!search ||
			t.name.toLowerCase().includes(search.toLowerCase()) ||
			t.description?.toLowerCase().includes(search.toLowerCase()),
	)

	if (!isLoaded) {
		return (
			<>
				<Nav />
				<main className="p-6">
					<Text>Loading...</Text>
				</main>
			</>
		)
	}

	if (!apiToken) {
		return (
			<>
				<Nav onLogout={logout} />
				<main className="p-6">
					<Text>Please sign in to view templates.</Text>
					<Link href="/login" className="ml-2 text-kumo-primary">
						Sign in
					</Link>
				</main>
			</>
		)
	}

	return (
		<>
			<Nav onLogout={logout} />
			<main className="max-w-6xl mx-auto p-6">
				<div className="flex items-center justify-between mb-6">
					<h1 className="text-2xl font-bold text-kumo-default">
						Agent Templates
					</h1>
					<Link href="/templates/new">
						<Button icon={<PlusIcon size={16} />}>New Template</Button>
					</Link>
				</div>

				{/* Search & filter */}
				<div className="flex items-center gap-3 mb-6">
					<input
						type="text"
						placeholder="Search templates..."
						value={search}
						onChange={e => setSearch(e.target.value)}
						className="flex-1 px-4 py-2 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default text-sm"
					/>
					<div className="flex gap-2">
						{(['all', 'me', 'public'] as const).map(f => (
							<button
								key={f}
								type="button"
								onClick={() => setFilter(f)}
								className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
									filter === f
										? 'bg-kumo-contrast text-kumo-inverse'
										: 'text-kumo-secondary hover:text-kumo-default hover:bg-kumo-hover'
								}`}
							>
								{f === 'all' ? 'All' : f === 'me' ? 'Mine' : 'Public'}
							</button>
						))}
					</div>
				</div>

				{loading ? (
					<div className="text-center py-12">
						<Text>Loading templates...</Text>
					</div>
				) : filtered.length === 0 ? (
					<div className="text-center py-12">
						<p className="text-kumo-secondary">
							{search ? 'No templates match your search' : 'No templates yet'}
						</p>
						{!search && (
							<Link href="/templates/new" className="mt-3 inline-block">
								<Button>Create your first template</Button>
							</Link>
						)}
					</div>
				) : (
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{filtered.map(template => {
							const tags = parseTags(template.tags)
							const isPublic = !!template.isPublic
							return (
								<div
									key={template.id}
									className="rounded-xl border border-kumo-line bg-kumo-base p-4 flex flex-col gap-3"
								>
									<div className="flex items-start justify-between">
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2">
												<p className="font-semibold text-kumo-default truncate">
													{template.name}
												</p>
												{isPublic && (
													<GlobeIcon size={14} className="text-kumo-primary" />
												)}
											</div>
											{template.description && (
												<p className="text-sm text-kumo-secondary mt-0.5 line-clamp-2">
													{template.description}
												</p>
											)}
										</div>
									</div>

									{tags.length > 0 && (
										<div className="flex flex-wrap gap-1">
											{tags.map(tag => (
												<span
													key={tag}
													className="text-xs px-2 py-0.5 rounded-full bg-kumo-primary/15 text-kumo-primary"
												>
													{tag}
												</span>
											))}
										</div>
									)}

									<div className="flex items-center gap-2 mt-auto pt-2 border-t border-kumo-line">
										<button
											type="button"
											onClick={() => handleInstantiate(template.id)}
											className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-kumo-primary text-white text-xs font-medium hover:opacity-90 transition-opacity"
										>
											<PlayIcon size={14} weight="fill" />
											Launch
										</button>
										<Link
											href={`/templates/${template.id}`}
											className="p-1.5 rounded-lg text-kumo-secondary hover:text-kumo-default hover:bg-kumo-hover transition-colors"
										>
											<EyeIcon size={16} />
										</Link>
										<Link
											href={`/templates/${template.id}/edit`}
											className="p-1.5 rounded-lg text-kumo-secondary hover:text-kumo-default hover:bg-kumo-hover transition-colors"
										>
											<PencilIcon size={16} />
										</Link>
										<button
											type="button"
											onClick={() => handleDuplicate(template.id)}
											className="p-1.5 rounded-lg text-kumo-secondary hover:text-kumo-default hover:bg-kumo-hover transition-colors"
										>
											<CopyIcon size={16} />
										</button>
										<button
											type="button"
											onClick={() => handleTogglePublic(template.id, isPublic)}
											className="p-1.5 rounded-lg text-kumo-secondary hover:text-kumo-default hover:bg-kumo-hover transition-colors"
										>
											{isPublic ? (
												<LockIcon size={16} />
											) : (
												<GlobeIcon size={16} />
											)}
										</button>
										<button
											type="button"
											onClick={() => handleDelete(template.id)}
											className="p-1.5 rounded-lg text-kumo-secondary hover:text-kumo-danger hover:bg-kumo-hover transition-colors ml-auto"
										>
											<TrashIcon size={16} />
										</button>
									</div>
								</div>
							)
						})}
					</div>
				)}
			</main>
		</>
	)
}
