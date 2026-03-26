'use client'
import {useCallback, useEffect, useState} from 'react'

interface AuthState {
	apiToken: string | null
	userId: string | null
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
		serverUrl: DEFAULT_SERVER_URL,
		isLoaded: false,
	})

	useEffect(() => {
		setAuth({
			apiToken: localStorage.getItem(AUTH_KEYS.token),
			userId: localStorage.getItem(AUTH_KEYS.userId),
			serverUrl:
				localStorage.getItem(AUTH_KEYS.serverUrl) || DEFAULT_SERVER_URL,
			isLoaded: true,
		})
	}, [])

	const login = useCallback(
		(apiToken: string, userId: string, serverUrl?: string) => {
			localStorage.setItem(AUTH_KEYS.token, apiToken)
			localStorage.setItem(AUTH_KEYS.userId, userId)
			if (serverUrl) localStorage.setItem(AUTH_KEYS.serverUrl, serverUrl)
			setAuth({
				apiToken,
				userId,
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
			serverUrl: DEFAULT_SERVER_URL,
			isLoaded: true,
		})
	}, [])

	return {
		...auth,
		isAuthed: !!auth.apiToken,
		login,
		logout,
	}
}
