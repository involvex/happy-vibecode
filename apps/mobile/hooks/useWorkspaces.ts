import {useCallback, useEffect, useState} from 'react'
import * as SecureStore from 'expo-secure-store'

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
		const loadData = async () => {
			try {
				const stored = await SecureStore.getItemAsync(WORKSPACES_KEY)
				if (stored) {
					const parsed = JSON.parse(stored) as Workspace[]
					setWorkspaces(parsed)
				}

				const activeId = await SecureStore.getItemAsync(ACTIVE_WORKSPACE_KEY)
				setActiveWorkspaceId(activeId)
			} catch {
				setWorkspaces([])
			}
			setIsLoaded(true)
		}

		loadData()
	}, [])

	const saveWorkspaces = useCallback(async (newWorkspaces: Workspace[]) => {
		setWorkspaces(newWorkspaces)
		await SecureStore.setItemAsync(
			WORKSPACES_KEY,
			JSON.stringify(newWorkspaces),
		)
	}, [])

	const addWorkspace = useCallback(
		async (workspace: Omit<Workspace, 'id' | 'isActive'>) => {
			const newWorkspace: Workspace = {
				...workspace,
				id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
				isActive: false,
			}
			const newWorkspaces = [...workspaces, newWorkspace]
			await saveWorkspaces(newWorkspaces)
			return newWorkspace
		},
		[workspaces, saveWorkspaces],
	)

	const removeWorkspace = useCallback(
		async (id: string) => {
			const newWorkspaces = workspaces.filter(w => w.id !== id)
			await saveWorkspaces(newWorkspaces)
			if (activeWorkspaceId === id) {
				setActiveWorkspaceId(null)
				await SecureStore.deleteItemAsync(ACTIVE_WORKSPACE_KEY)
			}
		},
		[workspaces, saveWorkspaces, activeWorkspaceId],
	)

	const updateWorkspace = useCallback(
		async (id: string, updates: Partial<Omit<Workspace, 'id'>>) => {
			const newWorkspaces = workspaces.map(w =>
				w.id === id ? {...w, ...updates} : w,
			)
			await saveWorkspaces(newWorkspaces)
		},
		[workspaces, saveWorkspaces],
	)

	const setActiveWorkspace = useCallback(
		async (id: string | null) => {
			setActiveWorkspaceId(id)
			if (id) {
				await SecureStore.setItemAsync(ACTIVE_WORKSPACE_KEY, id)
			} else {
				await SecureStore.deleteItemAsync(ACTIVE_WORKSPACE_KEY)
			}

			const newWorkspaces = workspaces.map(w => ({
				...w,
				isActive: w.id === id,
			}))
			await saveWorkspaces(newWorkspaces)
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
