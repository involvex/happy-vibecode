import {useCallback, useEffect, useState} from 'react'
import * as SecureStore from 'expo-secure-store'
import {authClient} from '../lib/auth-client'

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

type BetterAuthUser = {
	id: string
	name: string
	email: string
	apiToken?: string
}

export function useAuth(): AuthState {
	const {data: session, isPending} = authClient.useSession()

	const [legacyToken, setLegacyToken] = useState<string | null>(null)
	const [legacyUserId, setLegacyUserId] = useState<string | null>(null)
	const [serverUrl, setServerUrlState] = useState<string | null>(null)
	const [legacyLoaded, setLegacyLoaded] = useState(false)

	useEffect(() => {
		Promise.all([
			SecureStore.getItemAsync(KEYS.token),
			SecureStore.getItemAsync(KEYS.userId),
			SecureStore.getItemAsync(KEYS.serverUrl),
		]).then(([token, uid, url]) => {
			setLegacyToken(token)
			setLegacyUserId(uid)
			setServerUrlState(url)
			setLegacyLoaded(true)
		})
	}, [])

	const betterAuthUser = session?.user as BetterAuthUser | undefined
	const isLoaded = !isPending && legacyLoaded

	// Better Auth session takes priority; fall back to SecureStore for CLI tokens
	const apiToken = betterAuthUser?.apiToken ?? legacyToken
	const userId = betterAuthUser?.id ?? legacyUserId
	const isAuthed = isLoaded && !!apiToken

	const login = useCallback(
		async (token: string, uid: string, url?: string) => {
			await Promise.all([
				SecureStore.setItemAsync(KEYS.token, token),
				SecureStore.setItemAsync(KEYS.userId, uid),
				url ? SecureStore.setItemAsync(KEYS.serverUrl, url) : Promise.resolve(),
			])
			setLegacyToken(token)
			setLegacyUserId(uid)
			if (url) setServerUrlState(url)
		},
		[],
	)

	const logout = useCallback(async () => {
		await authClient.signOut()
		await Promise.all([
			SecureStore.deleteItemAsync(KEYS.token),
			SecureStore.deleteItemAsync(KEYS.userId),
		])
		setLegacyToken(null)
		setLegacyUserId(null)
	}, [])

	const setServerUrl = useCallback(async (url: string) => {
		await SecureStore.setItemAsync(KEYS.serverUrl, url)
		setServerUrlState(url)
	}, [])

	return {
		isAuthed,
		apiToken,
		userId,
		serverUrl,
		login,
		logout,
		setServerUrl,
	}
}
