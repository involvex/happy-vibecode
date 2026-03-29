import {useCallback, useEffect, useMemo, useState} from 'react'
interface AgentTemplate {
	id: string
	userId: string
	name: string
	description?: string | null
	tags: string[] | string
	isPublic: boolean | number
	latestVersionId?: string | null
	createdAt: string
	updatedAt: string
}

const DEFAULT_URL = 'https://happy-vibecode.involvex.workers.dev'

export function useTemplates(
	apiToken: string | null,
	serverUrl: string | null,
) {
	const [templates, setTemplates] = useState<AgentTemplate[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const baseUrl = serverUrl ?? DEFAULT_URL

	const headers = useMemo(
		() => ({
			'Content-Type': 'application/json',
			...(apiToken ? {Authorization: `Bearer ${apiToken}`} : {}),
		}),
		[apiToken],
	)

	const fetchTemplates = useCallback(
		async (owner: 'me' | 'public' | 'all' = 'all') => {
			if (!apiToken) return
			setIsLoading(true)
			try {
				const res = await fetch(`${baseUrl}/api/templates?owner=${owner}`, {
					headers,
				})
				if (res.ok) {
					const data = (await res.json()) as {templates: AgentTemplate[]}
					setTemplates(data.templates)
				}
			} catch {
				// Will retry on next load
			} finally {
				setIsLoading(false)
			}
		},
		[apiToken, baseUrl, headers],
	)

	const createTemplate = useCallback(
		async (data: {
			name: string
			description?: string
			tags?: string[]
			promptTemplate: string
			defaultModel?: string
			defaultProvider?: string
			tools?: string[]
			parameters?: Record<string, unknown>
			isPublic?: boolean
		}) => {
			const res = await fetch(`${baseUrl}/api/templates`, {
				method: 'POST',
				headers,
				body: JSON.stringify(data),
			})
			if (!res.ok) throw new Error('Failed to create template')
			const result = (await res.json()) as {template: AgentTemplate}
			setTemplates(prev => [result.template, ...prev])
			return result.template
		},
		[baseUrl, headers],
	)

	const instantiate = useCallback(
		async (templateId: string, versionId?: string) => {
			const res = await fetch(
				`${baseUrl}/api/templates/${templateId}/instantiate`,
				{
					method: 'POST',
					headers,
					body: JSON.stringify({versionId}),
				},
			)
			if (!res.ok) throw new Error('Failed to instantiate template')
			return (await res.json()) as {
				session: {id: string}
				template: AgentTemplate
				version: {id: string}
			}
		},
		[baseUrl, headers],
	)

	const togglePublic = useCallback(
		async (templateId: string, isPublic: boolean) => {
			const res = await fetch(`${baseUrl}/api/templates/${templateId}/share`, {
				method: 'PATCH',
				headers,
				body: JSON.stringify({isPublic}),
			})
			if (!res.ok) throw new Error('Failed to update sharing')
			setTemplates(prev =>
				prev.map(t => (t.id === templateId ? {...t, isPublic} : t)),
			)
		},
		[baseUrl, headers],
	)

	const deleteTemplate = useCallback(
		async (templateId: string) => {
			const res = await fetch(`${baseUrl}/api/templates/${templateId}`, {
				method: 'DELETE',
				headers,
			})
			if (!res.ok) throw new Error('Failed to delete template')
			setTemplates(prev => prev.filter(t => t.id !== templateId))
		},
		[baseUrl, headers],
	)

	const duplicate = useCallback(
		async (templateId: string) => {
			const res = await fetch(
				`${baseUrl}/api/templates/${templateId}/duplicate`,
				{method: 'POST', headers},
			)
			if (!res.ok) throw new Error('Failed to duplicate template')
			const result = (await res.json()) as {template: AgentTemplate}
			setTemplates(prev => [result.template, ...prev])
			return result.template
		},
		[baseUrl, headers],
	)

	useEffect(() => {
		if (apiToken) {
			fetchTemplates()
		}
	}, [apiToken, fetchTemplates])

	return {
		templates,
		isLoading,
		fetchTemplates,
		createTemplate,
		instantiate,
		togglePublic,
		deleteTemplate,
		duplicate,
	}
}
