'use client'
import type {AgentTemplate, AgentTemplateVersion} from '@happy-vibecode/shared'
import {useCallback, useEffect, useState} from 'react'

export function useTemplates() {
	const [templates, setTemplates] = useState<AgentTemplate[]>([])
	const [isLoading, setIsLoading] = useState(false)

	const headers = useCallback((): HeadersInit => {
		const token = localStorage.getItem('happy-api-token')
		return {
			'Content-Type': 'application/json',
			...(token ? {Authorization: `Bearer ${token}`} : {}),
		}
	}, [])

	const fetchTemplates = useCallback(
		async (owner: 'me' | 'public' | 'all' = 'all') => {
			setIsLoading(true)
			try {
				const res = await fetch(`/api/templates?owner=${owner}`, {
					headers: headers(),
				})
				if (res.ok) {
					const data = (await res.json()) as {templates: AgentTemplate[]}
					setTemplates(data.templates)
				}
			} catch {
				// Will retry
			} finally {
				setIsLoading(false)
			}
		},
		[headers],
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
			const res = await fetch('/api/templates', {
				method: 'POST',
				headers: headers(),
				body: JSON.stringify(data),
			})
			if (!res.ok) throw new Error('Failed to create template')
			const result = (await res.json()) as {template: AgentTemplate}
			setTemplates(prev => [result.template, ...prev])
			return result.template
		},
		[headers],
	)

	const getTemplate = useCallback(
		async (id: string) => {
			const res = await fetch(`/api/templates/${id}`, {
				headers: headers(),
			})
			if (!res.ok) throw new Error('Template not found')
			return (await res.json()) as {
				template: AgentTemplate
				versions: AgentTemplateVersion[]
			}
		},
		[headers],
	)

	const updateTemplate = useCallback(
		async (id: string, data: Record<string, unknown>) => {
			const res = await fetch(`/api/templates/${id}`, {
				method: 'PUT',
				headers: headers(),
				body: JSON.stringify(data),
			})
			if (!res.ok) throw new Error('Failed to update template')
			return (await res.json()) as {template: AgentTemplate}
		},
		[headers],
	)

	const deleteTemplate = useCallback(
		async (id: string) => {
			const res = await fetch(`/api/templates/${id}`, {
				method: 'DELETE',
				headers: headers(),
			})
			if (!res.ok) throw new Error('Failed to delete template')
			setTemplates(prev => prev.filter(t => t.id !== id))
		},
		[headers],
	)

	const createVersion = useCallback(
		async (
			templateId: string,
			data: {
				promptTemplate: string
				defaultModel?: string
				defaultProvider?: string
				tools?: string[]
				parameters?: Record<string, unknown>
				changeNotes?: string
			},
		) => {
			const res = await fetch(`/api/templates/${templateId}/versions`, {
				method: 'POST',
				headers: headers(),
				body: JSON.stringify(data),
			})
			if (!res.ok) throw new Error('Failed to create version')
			return (await res.json()) as {version: AgentTemplateVersion}
		},
		[headers],
	)

	const instantiate = useCallback(
		async (templateId: string, versionId?: string) => {
			const res = await fetch(`/api/templates/${templateId}/instantiate`, {
				method: 'POST',
				headers: headers(),
				body: JSON.stringify({versionId}),
			})
			if (!res.ok) throw new Error('Failed to instantiate template')
			return (await res.json()) as {
				session: {id: string}
				template: AgentTemplate
				version: AgentTemplateVersion
			}
		},
		[headers],
	)

	const togglePublic = useCallback(
		async (id: string, isPublic: boolean) => {
			const res = await fetch(`/api/templates/${id}/share`, {
				method: 'PATCH',
				headers: headers(),
				body: JSON.stringify({isPublic}),
			})
			if (!res.ok) throw new Error('Failed to update sharing')
			setTemplates(prev => prev.map(t => (t.id === id ? {...t, isPublic} : t)))
		},
		[headers],
	)

	const duplicate = useCallback(
		async (id: string) => {
			const res = await fetch(`/api/templates/${id}/duplicate`, {
				method: 'POST',
				headers: headers(),
			})
			if (!res.ok) throw new Error('Failed to duplicate template')
			const result = (await res.json()) as {template: AgentTemplate}
			setTemplates(prev => [result.template, ...prev])
			return result.template
		},
		[headers],
	)

	useEffect(() => {
		fetchTemplates()
	}, [fetchTemplates])

	return {
		templates,
		isLoading,
		fetchTemplates,
		createTemplate,
		getTemplate,
		updateTemplate,
		deleteTemplate,
		createVersion,
		instantiate,
		togglePublic,
		duplicate,
	}
}
