'use client'
import {useAuth} from '../../hooks/useAuth'
import {useRouter} from 'next/navigation'
import {Nav} from '../../components/Nav'
import {Button} from '@cloudflare/kumo'
import {useState} from 'react'
import Link from 'next/link'

export default function NewTemplatePage() {
	const {apiToken, logout} = useAuth()
	const router = useRouter()
	const [name, setName] = useState('')
	const [description, setDescription] = useState('')
	const [promptTemplate, setPromptTemplate] = useState('')
	const [defaultModel, setDefaultModel] = useState('')
	const [tags, setTags] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!name.trim() || !promptTemplate.trim()) {
			setError('Name and prompt template are required.')
			return
		}
		setLoading(true)
		setError('')
		try {
			const res = await fetch('/api/templates', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${apiToken}`,
				},
				body: JSON.stringify({
					name: name.trim(),
					description: description.trim() || undefined,
					promptTemplate: promptTemplate.trim(),
					defaultModel: defaultModel.trim() || undefined,
					tags: tags
						.split(',')
						.map(t => t.trim().toLowerCase())
						.filter(Boolean),
				}),
			})
			if (!res.ok) throw new Error('Failed to create template')
			const data = (await res.json()) as {template: {id: string}}
			router.push(`/templates/${data.template.id}`)
		} catch (err) {
			setError((err as Error).message)
		} finally {
			setLoading(false)
		}
	}

	return (
		<>
			<Nav onLogout={logout} />
			<main className="max-w-2xl mx-auto p-6">
				<div className="flex items-center gap-3 mb-6">
					<Link
						href="/templates"
						className="text-kumo-secondary hover:text-kumo-default"
					>
						Back
					</Link>
					<h1 className="text-2xl font-bold text-kumo-default">New Template</h1>
				</div>

				{error && (
					<div className="mb-4 p-3 rounded-lg bg-kumo-danger/15 text-kumo-danger text-sm">
						{error}
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-kumo-secondary mb-1">
							Name *
						</label>
						<input
							type="text"
							value={name}
							onChange={e => setName(e.target.value)}
							className="w-full px-4 py-2 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default text-sm"
							placeholder="My Template"
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
							placeholder="What this template does..."
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
							placeholder="You are an expert developer. Review the following code and..."
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
							placeholder="gpt-4, claude-3-opus, etc."
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
							placeholder="review, testing, documentation"
						/>
					</div>

					<div className="flex gap-3 pt-2">
						<Button type="submit" disabled={loading}>
							{loading ? 'Creating...' : 'Create Template'}
						</Button>
						<Link href="/templates">
							<Button variant="secondary">Cancel</Button>
						</Link>
					</div>
				</form>
			</main>
		</>
	)
}
