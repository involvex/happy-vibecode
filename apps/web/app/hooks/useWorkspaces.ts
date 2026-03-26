'use client'
import {useCallback, useEffect, useState} from 'react'

export interface Workspace {
	id: string
	name: string
	path: string
	defaultProvider?: string
	defaultModel?: string
	isActive: boolean
}

const WORKSPACES_KEY = 'happy-workspaces'
const ACTIVE_WORKSPACE_KEY = 'happy-active-workspace'

export function useWorkspaces() {
	const [workspaces, setWorkspaces] = useState<Workspace[]>([])
	const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(
		null,
	)
	const [isLoaded, setIsLoaded] = useState(false)

	useEffect(() => {
		const stored = localStorage.getItem(WORKSPACES_KEY)
		if (stored) {
			try {
				const parsed = JSON.parse(stored) as Workspace[]
				setWorkspaces(parsed)
			} catch {
				setWorkspaces([])
			}
		}

		const activeId = localStorage.getItem(ACTIVE_WORKSPACE_KEY)
		setActiveWorkspaceId(activeId)
		setIsLoaded(true)
	}, [])

	const saveWorkspaces = useCallback((newWorkspaces: Workspace[]) => {
		setWorkspaces(newWorkspaces)
		localStorage.setItem(WORKSPACES_KEY, JSON.stringify(newWorkspaces))
	}, [])

	const addWorkspace = useCallback(
		(workspace: Omit<Workspace, 'id' | 'isActive'>) => {
			const newWorkspace: Workspace = {
				...workspace,
				id: crypto.randomUUID(),
				isActive: false,
			}
			const newWorkspaces = [...workspaces, newWorkspace]
			saveWorkspaces(newWorkspaces)
			return newWorkspace
		},
		[workspaces, saveWorkspaces],
	)

	const removeWorkspace = useCallback(
		(id: string) => {
			const newWorkspaces = workspaces.filter(w => w.id !== id)
			saveWorkspaces(newWorkspaces)
			if (activeWorkspaceId === id) {
				setActiveWorkspaceId(null)
				localStorage.removeItem(ACTIVE_WORKSPACE_KEY)
			}
		},
		[workspaces, saveWorkspaces, activeWorkspaceId],
	)

	const updateWorkspace = useCallback(
		(id: string, updates: Partial<Omit<Workspace, 'id'>>) => {
			const newWorkspaces = workspaces.map(w =>
				w.id === id ? {...w, ...updates} : w,
			)
			saveWorkspaces(newWorkspaces)
		},
		[workspaces, saveWorkspaces],
	)

	const setActiveWorkspace = useCallback(
		(id: string | null) => {
			setActiveWorkspaceId(id)
			if (id) {
				localStorage.setItem(ACTIVE_WORKSPACE_KEY, id)
			} else {
				localStorage.removeItem(ACTIVE_WORKSPACE_KEY)
			}

			const newWorkspaces = workspaces.map(w => ({
				...w,
				isActive: w.id === id,
			}))
			saveWorkspaces(newWorkspaces)
		},
		[workspaces, saveWorkspaces],
	)

	const getActiveWorkspace = useCallback(() => {
		if (activeWorkspaceId) {
			return workspaces.find(w => w.id === activeWorkspaceId)
		}
		return workspaces.find(w => w.isActive) || workspaces[0] || null
	}, [workspaces, activeWorkspaceId])

	return {
		workspaces,
		activeWorkspaceId,
		isLoaded,
		addWorkspace,
		removeWorkspace,
		updateWorkspace,
		setActiveWorkspace,
		getActiveWorkspace,
	}
}
