import {useCallback, useEffect, useState} from 'react'
import * as SecureStore from 'expo-secure-store'

const KEYS = {
	token: 'happy-api-token',
	userId: 'happy-user-id',
	serverUrl: 'happy-server-url',
} as const

export interface AuthState {
	isAuthed: boolean
	apiToken: string | null
	userId: string | null
	serverUrl: string | null
	login: (token: string, userId: string, url?: string) => Promise<void>
	logout: () => Promise<void>
	setServerUrl: (url: string) => Promise<void>
}

export function useAuth(): AuthState {
	const [apiToken, setApiToken] = useState<string | null>(null)
	const [userId, setUserId] = useState<string | null>(null)
	const [serverUrl, setServerUrlState] = useState<string | null>(null)
	const [loaded, setLoaded] = useState(false)

	useEffect(() => {
		Promise.all([
			SecureStore.getItemAsync(KEYS.token),
			SecureStore.getItemAsync(KEYS.userId),
			SecureStore.getItemAsync(KEYS.serverUrl),
		]).then(([token, uid, url]) => {
			setApiToken(token)
			setUserId(uid)
			setServerUrlState(url)
			setLoaded(true)
		})
	}, [])

	const login = useCallback(
		async (token: string, uid: string, url?: string) => {
			await Promise.all([
				SecureStore.setItemAsync(KEYS.token, token),
				SecureStore.setItemAsync(KEYS.userId, uid),
				url ? SecureStore.setItemAsync(KEYS.serverUrl, url) : Promise.resolve(),
			])
			setApiToken(token)
			setUserId(uid)
			if (url) setServerUrlState(url)
		},
		[],
	)

	const logout = useCallback(async () => {
		await Promise.all([
			SecureStore.deleteItemAsync(KEYS.token),
			SecureStore.deleteItemAsync(KEYS.userId),
		])
		setApiToken(null)
		setUserId(null)
	}, [])

	const setServerUrl = useCallback(async (url: string) => {
		await SecureStore.setItemAsync(KEYS.serverUrl, url)
		setServerUrlState(url)
	}, [])

	return {
		isAuthed: loaded && !!apiToken,
		apiToken,
		userId,
		serverUrl,
		login,
		logout,
		setServerUrl,
	}
}
