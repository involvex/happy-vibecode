'use client'
import {GlobeIcon, PlayIcon, TrashIcon} from '@phosphor-icons/react'
import {useCallback, useEffect, useState} from 'react'
import {useParams, useRouter} from 'next/navigation'
import {Button, Text} from '@cloudflare/kumo'
import {useAuth} from '../../hooks/useAuth'
import {Nav} from '../../components/Nav'
import Link from 'next/link'

interface Template {
	id: string
	userId: string
	name: string
	description: string | null
	tags: string
	isPublic: number | boolean
	createdAt: string
}

interface Version {
	id: string
	version: number
	promptTemplate: string
	defaultModel: string | null
	defaultProvider: string | null
	tools: string
	parameters: string
	changeNotes: string | null
	createdAt: string
}

function parseJsonArray(str: string): string[] {
	try {
		const parsed = JSON.parse(str)
		return Array.isArray(parsed) ? parsed : []
	} catch {
		return []
	}
}

export default function TemplateDetailPage() {
	const {id} = useParams<{id: string}>()
	const {apiToken, isLoaded, logout} = useAuth()
	const router = useRouter()
	const [template, setTemplate] = useState<Template | null>(null)
	const [versions, setVersions] = useState<Version[]>([])
	const [loading, setLoading] = useState(true)

	const fetchData = useCallback(async () => {
		if (!apiToken || !id) return
		try {
			const res = await fetch(`/api/templates/${id}`, {
				headers: {Authorization: `Bearer ${apiToken}`},
			})
			if (!res.ok) {
				router.push('/templates')
				return
			}
			const data = (await res.json()) as {
				template: Template
				versions: Version[]
			}
			setTemplate(data.template)
			setVersions(data.versions)
		} catch {
			router.push('/templates')
		} finally {
			setLoading(false)
		}
	}, [apiToken, id, router])

	useEffect(() => {
		if (isLoaded && apiToken) fetchData()
	}, [isLoaded, apiToken, fetchData])

	const handleInstantiate = async () => {
		if (!template) return
		try {
			const res = await fetch(`/api/templates/${template.id}/instantiate`, {
				method: 'POST',
				headers: {Authorization: `Bearer ${apiToken}`},
			})
			if (res.ok) {
				router.push('/chat')
			}
		} catch {
			// ignore
		}
	}

	const handleDelete = async () => {
		if (!template || !confirm('Delete this template?')) return
		try {
			await fetch(`/api/templates/${template.id}`, {
				method: 'DELETE',
				headers: {Authorization: `Bearer ${apiToken}`},
			})
			router.push('/templates')
		} catch {
			// ignore
		}
	}

	if (!isLoaded || loading) {
		return (
			<>
				<Nav />
				<main className="p-6">
					<Text>Loading...</Text>
				</main>
			</>
		)
	}

	if (!template) {
		return (
			<>
				<Nav onLogout={logout} />
				<main className="p-6">
					<Text>Template not found.</Text>
					<Link
						href="/templates"
						className="ml-2 text-kumo-primary"
					>
						Back to templates
					</Link>
				</main>
			</>
		)
	}

	const tags = parseJsonArray(template.tags)
	const latestVersion = versions[0]
	const isPublic = !!template.isPublic

	return (
		<>
			<Nav onLogout={logout} />
			<main className="max-w-3xl mx-auto p-6">
				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center gap-3">
						<Link
							href="/templates"
							className="text-kumo-secondary hover:text-kumo-default"
						>
							Back
						</Link>
						<h1 className="text-2xl font-bold text-kumo-default">
							{template.name}
						</h1>
						{isPublic && (
							<GlobeIcon
								size={16}
								className="text-kumo-primary"
							/>
						)}
					</div>
					<div className="flex items-center gap-2">
						<Link href={`/templates/${template.id}/edit`}>
							<Button
								variant="secondary"
								size="sm"
							>
								Edit
							</Button>
						</Link>
						<Button
							variant="destructive"
							size="sm"
							icon={<TrashIcon size={14} />}
							onClick={handleDelete}
						>
							Delete
						</Button>
					</div>
				</div>

				{template.description && (
					<p className="text-kumo-secondary mb-4">{template.description}</p>
				)}

				{tags.length > 0 && (
					<div className="flex flex-wrap gap-1.5 mb-4">
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

				<Button
					icon={
						<PlayIcon
							size={16}
							weight="fill"
						/>
					}
					onClick={handleInstantiate}
					className="mb-6"
				>
					Launch Agent
				</Button>

				{latestVersion && (
					<div className="rounded-xl border border-kumo-line bg-kumo-base p-4 mb-6">
						<p className="font-bold text-kumo-default mb-3">
							Latest Version (v{latestVersion.version})
						</p>
						{latestVersion.defaultModel && (
							<div className="mb-3">
								<p className="text-sm text-kumo-secondary">
									Model:{' '}
									<span className="text-kumo-default font-medium">
										{latestVersion.defaultModel}
									</span>
								</p>
							</div>
						)}
						{parseJsonArray(latestVersion.tools).length > 0 && (
							<div className="mb-3">
								<p className="text-sm text-kumo-secondary mb-1">Tools:</p>
								<div className="flex flex-wrap gap-1">
									{parseJsonArray(latestVersion.tools).map(tool => (
										<span
											key={tool}
											className="text-xs px-2 py-0.5 rounded bg-kumo-control text-kumo-default"
										>
											{tool}
										</span>
									))}
								</div>
							</div>
						)}
						<div>
							<p className="text-sm text-kumo-secondary mb-1">Prompt:</p>
							<pre className="text-sm font-mono text-kumo-default whitespace-pre-wrap bg-kumo-control p-3 rounded-lg">
								{latestVersion.promptTemplate}
							</pre>
						</div>
					</div>
				)}

				{versions.length > 1 && (
					<div>
						<p className="font-bold text-kumo-default mb-3">Version History</p>
						<div className="space-y-2">
							{versions.map(v => (
								<div
									key={v.id}
									className="rounded-lg border border-kumo-line bg-kumo-base px-4 py-3 flex items-center justify-between"
								>
									<div>
										<p className="text-sm font-medium text-kumo-default">
											v{v.version}
										</p>
										{v.changeNotes && (
											<p className="text-xs text-kumo-secondary mt-0.5">
												{v.changeNotes}
											</p>
										)}
									</div>
									<p className="text-xs text-kumo-secondary">
										{new Date(v.createdAt).toLocaleDateString()}
									</p>
								</div>
							))}
						</div>
					</div>
				)}
			</main>
		</>
	)
}
