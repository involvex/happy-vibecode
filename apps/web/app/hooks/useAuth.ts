'use client'
import {useCallback, useEffect, useState} from 'react'
import {authClient} from '../../lib/auth-client'

interface UserPreferences {
	theme: 'light' | 'dark' | 'system'
	notifications: boolean
	language: string
}

interface AuthState {
	apiToken: string | null
	userId: string | null
	email: string | null
	nickname: string | null
	preferences: UserPreferences | null
	githubId: string | null
	hasPassword: boolean
	role: 'user' | 'admin'
	serverUrl: string
	isLoaded: boolean
}

const DEFAULT_SERVER_URL = ''

const AUTH_KEYS = {
	token: 'happy-api-token',
	userId: 'happy-user-id',
	serverUrl: 'happy-server-url',
}

type BetterAuthUser = {
	apiToken?: string
	role?: string
	id: string
	email?: string | null
	name?: string | null
}

export function useAuth() {
	const {data: session, isPending} = authClient.useSession()

	const [auth, setAuth] = useState<AuthState>({
		apiToken: null,
		userId: null,
		email: null,
		nickname: null,
		preferences: null,
		githubId: null,
		hasPassword: false,
		role: 'user',
		serverUrl: DEFAULT_SERVER_URL,
		isLoaded: false,
	})

	useEffect(() => {
		if (isPending) return

		if (session?.user) {
			const u = session.user as BetterAuthUser
			const apiToken = u.apiToken ?? localStorage.getItem(AUTH_KEYS.token)
			const userId = u.id
			setAuth(prev => ({
				...prev,
				apiToken: apiToken ?? null,
				userId,
				email: u.email ?? null,
				nickname: u.name ?? null,
				role: (u.role as 'user' | 'admin') ?? 'user',
				serverUrl:
					localStorage.getItem(AUTH_KEYS.serverUrl) ?? DEFAULT_SERVER_URL,
				isLoaded: true,
			}))
			// Keep localStorage in sync for legacy paths
			if (apiToken) localStorage.setItem(AUTH_KEYS.token, apiToken)
			localStorage.setItem(AUTH_KEYS.userId, userId)
			return
		}

		// No Better Auth session — fall back to localStorage (CLI/email users)
		setAuth({
			apiToken: localStorage.getItem(AUTH_KEYS.token),
			userId: localStorage.getItem(AUTH_KEYS.userId),
			email: null,
			nickname: null,
			preferences: null,
			githubId: null,
			hasPassword: false,
			role: 'user',
			serverUrl:
				localStorage.getItem(AUTH_KEYS.serverUrl) || DEFAULT_SERVER_URL,
			isLoaded: true,
		})
	}, [session, isPending])

	const login = useCallback(
		(
			apiToken: string,
			userId: string,
			serverUrl?: string,
			email?: string,
			nickname?: string,
			preferences?: UserPreferences,
			githubId?: string,
			hasPassword?: boolean,
		) => {
			localStorage.setItem(AUTH_KEYS.token, apiToken)
			localStorage.setItem(AUTH_KEYS.userId, userId)
			if (serverUrl) localStorage.setItem(AUTH_KEYS.serverUrl, serverUrl)
			setAuth({
				apiToken,
				userId,
				email: email ?? null,
				nickname: nickname ?? null,
				preferences: preferences ?? null,
				githubId: githubId ?? null,
				hasPassword: hasPassword ?? false,
				role: 'user',
				serverUrl: serverUrl || DEFAULT_SERVER_URL,
				isLoaded: true,
			})
		},
		[],
	)

	const logout = useCallback(async () => {
		await authClient.signOut()
		localStorage.removeItem(AUTH_KEYS.token)
		localStorage.removeItem(AUTH_KEYS.userId)
		setAuth({
			apiToken: null,
			userId: null,
			email: null,
			nickname: null,
			preferences: null,
			githubId: null,
			hasPassword: false,
			role: 'user',
			serverUrl: DEFAULT_SERVER_URL,
			isLoaded: true,
		})
	}, [])

	const refreshUser = useCallback(async () => {
		if (!auth.apiToken) return null
		try {
			const res = await fetch('/api/user/profile', {
				headers: {Authorization: `Bearer ${auth.apiToken}`},
			})
			if (!res.ok) return null
			const data = (await res.json()) as {
				email: string | null
				nickname: string | null
				preferences: UserPreferences | null
				githubId: string | null
				hasPassword: boolean
				role: 'user' | 'admin'
			}
			setAuth(prev => ({
				...prev,
				email: data.email,
				nickname: data.nickname,
				preferences: data.preferences,
				githubId: data.githubId,
				hasPassword: data.hasPassword,
				role: data.role,
			}))
			return data
		} catch {
			return null
		}
	}, [auth.apiToken])

	return {
		...auth,
		isAuthed: !!auth.apiToken,
		login,
		logout,
		refreshUser,
	}
}
