'use client'
import type {AgentTemplate, AgentTemplateVersion} from '@happy-vibecode/shared'
import {useCallback, useEffect, useState} from 'react'

export function useTemplates() {
	const [templates, setTemplates] = useState<AgentTemplate[]>([])
	const [isLoading, setIsLoading] = useState(false)

	const fetchTemplates = useCallback(
		async (owner: 'me' | 'public' | 'all' = 'all') => {
			setIsLoading(true)
			try {
				const res = await fetch(`/api/templates?owner=${owner}`)
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
		[],
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
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify(data),
			})
			if (!res.ok) throw new Error('Failed to create template')
			const result = (await res.json()) as {template: AgentTemplate}
			setTemplates(prev => [result.template, ...prev])
			return result.template
		},
		[],
	)

	const getTemplate = useCallback(async (id: string) => {
		const res = await fetch(`/api/templates/${id}`)
		if (!res.ok) throw new Error('Template not found')
		return (await res.json()) as {
			template: AgentTemplate
			versions: AgentTemplateVersion[]
		}
	}, [])

	const updateTemplate = useCallback(
		async (id: string, data: Record<string, unknown>) => {
			const res = await fetch(`/api/templates/${id}`, {
				method: 'PUT',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify(data),
			})
			if (!res.ok) throw new Error('Failed to update template')
			return (await res.json()) as {template: AgentTemplate}
		},
		[],
	)

	const deleteTemplate = useCallback(async (id: string) => {
		const res = await fetch(`/api/templates/${id}`, {
			method: 'DELETE',
		})
		if (!res.ok) throw new Error('Failed to delete template')
		setTemplates(prev => prev.filter(t => t.id !== id))
	}, [])

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
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify(data),
			})
			if (!res.ok) throw new Error('Failed to create version')
			return (await res.json()) as {version: AgentTemplateVersion}
		},
		[],
	)

	const instantiate = useCallback(
		async (templateId: string, versionId?: string) => {
			const res = await fetch(`/api/templates/${templateId}/instantiate`, {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({versionId}),
			})
			if (!res.ok) throw new Error('Failed to instantiate template')
			return (await res.json()) as {
				session: {id: string}
				template: AgentTemplate
				version: AgentTemplateVersion
			}
		},
		[],
	)

	const togglePublic = useCallback(async (id: string, isPublic: boolean) => {
		const res = await fetch(`/api/templates/${id}/share`, {
			method: 'PATCH',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify({isPublic}),
		})
		if (!res.ok) throw new Error('Failed to update sharing')
		setTemplates(prev => prev.map(t => (t.id === id ? {...t, isPublic} : t)))
	}, [])

	const duplicate = useCallback(async (id: string) => {
		const res = await fetch(`/api/templates/${id}/duplicate`, {
			method: 'POST',
		})
		if (!res.ok) throw new Error('Failed to duplicate template')
		const result = (await res.json()) as {template: AgentTemplate}
		setTemplates(prev => [result.template, ...prev])
		return result.template
	}, [])

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
