'use client'
import {useCallback, useEffect, useState} from 'react'
import {useParams, useRouter} from 'next/navigation'
import {useAuth} from '../../../hooks/useAuth'
import {Button, Text} from '@cloudflare/kumo'
import {Nav} from '../../../components/Nav'
import Link from 'next/link'

interface Version {
	id: string
	version: number
	promptTemplate: string
	defaultModel: string | null
	defaultProvider: string | null
	tools: string
	parameters: string
	changeNotes: string | null
}

interface Template {
	id: string
	name: string
	description: string | null
	tags: string
	isPublic: number | boolean
}

function parseTags(tags: string): string[] {
	try {
		const parsed = JSON.parse(tags)
		return Array.isArray(parsed) ? parsed : []
	} catch {
		return []
	}
}

export default function EditTemplatePage() {
	const {id} = useParams<{id: string}>()
	const {apiToken, isLoaded, logout} = useAuth()
	const router = useRouter()

	const [template, setTemplate] = useState<Template | null>(null)
	const [latestVersion, setLatestVersion] = useState<Version | null>(null)
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState('')

	const [name, setName] = useState('')
	const [description, setDescription] = useState('')
	const [promptTemplate, setPromptTemplate] = useState('')
	const [defaultModel, setDefaultModel] = useState('')
	const [tags, setTags] = useState('')
	const [changeNotes, setChangeNotes] = useState('')

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
			setLatestVersion(data.versions[0] ?? null)

			setName(data.template.name)
			setDescription(data.template.description ?? '')
			setTags(parseTags(data.template.tags).join(', '))
			if (data.versions[0]) {
				setPromptTemplate(data.versions[0].promptTemplate)
				setDefaultModel(data.versions[0].defaultModel ?? '')
			}
		} catch {
			router.push('/templates')
		} finally {
			setLoading(false)
		}
	}, [apiToken, id, router])

	useEffect(() => {
		if (isLoaded && apiToken) fetchData()
	}, [isLoaded, apiToken, fetchData])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!template) return
		setSaving(true)
		setError('')

		try {
			const metaRes = await fetch(`/api/templates/${template.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${apiToken}`,
				},
				body: JSON.stringify({
					name: name.trim(),
					description: description.trim() || undefined,
					tags: tags
						.split(',')
						.map(t => t.trim().toLowerCase())
						.filter(Boolean),
				}),
			})
			if (!metaRes.ok) throw new Error('Failed to update template')

			if (
				promptTemplate !== (latestVersion?.promptTemplate ?? '') ||
				defaultModel !== (latestVersion?.defaultModel ?? '')
			) {
				const verRes = await fetch(`/api/templates/${template.id}/versions`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${apiToken}`,
					},
					body: JSON.stringify({
						promptTemplate: promptTemplate.trim(),
						defaultModel: defaultModel.trim() || undefined,
						changeNotes: changeNotes.trim() || 'Updated configuration',
					}),
				})
				if (!verRes.ok) throw new Error('Failed to create version')
			}

			router.push(`/templates/${template.id}`)
		} catch (err) {
			setError((err as Error).message)
		} finally {
			setSaving(false)
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
				</main>
			</>
		)
	}

	return (
		<>
			<Nav onLogout={logout} />
			<main className="max-w-2xl mx-auto p-6">
				<div className="flex items-center gap-3 mb-6">
					<Link
						href={`/templates/${template.id}`}
						className="text-kumo-secondary hover:text-kumo-default"
					>
						Back
					</Link>
					<h1 className="text-2xl font-bold text-kumo-default">
						Edit Template
					</h1>
				</div>

				{error && (
					<div className="mb-4 p-3 rounded-lg bg-kumo-danger/15 text-kumo-danger text-sm">
						{error}
					</div>
				)}

				<form
					onSubmit={handleSubmit}
					className="space-y-4"
				>
					<div>
						<label className="block text-sm font-medium text-kumo-secondary mb-1">
							Name *
						</label>
						<input
							type="text"
							value={name}
							onChange={e => setName(e.target.value)}
							className="w-full px-4 py-2 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default text-sm"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-kumo-secondary mb-1">
							Description
						</label>
						<textarea
							value={description}
							onChange={e => setDescription(e.target.value)}
							rows={2}
							className="w-full px-4 py-2 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default text-sm resize-none"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-kumo-secondary mb-1">
							Prompt Template *
						</label>
						<textarea
							value={promptTemplate}
							onChange={e => setPromptTemplate(e.target.value)}
							rows={8}
							className="w-full px-4 py-2 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default text-sm font-mono resize-vertical"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-kumo-secondary mb-1">
							Default Model
						</label>
						<input
							type="text"
							value={defaultModel}
							onChange={e => setDefaultModel(e.target.value)}
							className="w-full px-4 py-2 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default text-sm"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-kumo-secondary mb-1">
							Tags (comma-separated)
						</label>
						<input
							type="text"
							value={tags}
							onChange={e => setTags(e.target.value)}
							className="w-full px-4 py-2 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default text-sm"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-kumo-secondary mb-1">
							Change Notes (for new version)
						</label>
						<input
							type="text"
							value={changeNotes}
							onChange={e => setChangeNotes(e.target.value)}
							className="w-full px-4 py-2 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default text-sm"
							placeholder="Describe what changed..."
						/>
					</div>

					<div className="flex gap-3 pt-2">
						<Button
							type="submit"
							disabled={saving}
						>
							{saving ? 'Saving...' : 'Save Changes'}
						</Button>
						<Link href={`/templates/${template.id}`}>
							<Button variant="secondary">Cancel</Button>
						</Link>
					</div>
				</form>
			</main>
		</>
	)
}
