'use client'
import {useCallback, useEffect, useState} from 'react'

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
	serverUrl: string
	isLoaded: boolean
}

const DEFAULT_SERVER_URL = ''

const AUTH_KEYS = {
	token: 'happy-api-token',
	userId: 'happy-user-id',
	serverUrl: 'happy-server-url',
}

export function useAuth() {
	const [auth, setAuth] = useState<AuthState>({
		apiToken: null,
		userId: null,
		email: null,
		nickname: null,
		preferences: null,
		githubId: null,
		hasPassword: false,
		serverUrl: DEFAULT_SERVER_URL,
		isLoaded: false,
	})

	useEffect(() => {
		setAuth({
			apiToken: localStorage.getItem(AUTH_KEYS.token),
			userId: localStorage.getItem(AUTH_KEYS.userId),
			email: null,
			nickname: null,
			preferences: null,
			githubId: null,
			hasPassword: false,
			serverUrl:
				localStorage.getItem(AUTH_KEYS.serverUrl) || DEFAULT_SERVER_URL,
			isLoaded: true,
		})
	}, [])

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
				serverUrl: serverUrl || DEFAULT_SERVER_URL,
				isLoaded: true,
			})
		},
		[],
	)

	const logout = useCallback(() => {
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
			}
			setAuth(prev => ({
				...prev,
				email: data.email,
				nickname: data.nickname,
				preferences: data.preferences,
				githubId: data.githubId,
				hasPassword: data.hasPassword,
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
