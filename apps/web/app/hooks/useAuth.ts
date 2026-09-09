'use client'
import type {UserSubscription} from '@happy-vibecode/shared'
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
	subscription: UserSubscription | null
	serverUrl: string
	isLoaded: boolean
}

const DEFAULT_SERVER_URL = ''

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
		subscription: null,
		serverUrl: DEFAULT_SERVER_URL,
		isLoaded: false,
	})

	useEffect(() => {
		if (isPending) return

		if (session?.user) {
			const u = session.user as {
				apiToken?: string
				role?: string
				id: string
				email?: string | null
				name?: string | null
			}
			setAuth(prev => ({
				...prev,
				apiToken: u.apiToken ?? null,
				userId: u.id,
				email: u.email ?? null,
				nickname: u.name ?? null,
				role: (u.role as 'user' | 'admin') ?? 'user',
				subscription: prev.subscription,
				isLoaded: true,
			}))
			return
		}

		setAuth({
			apiToken: null,
			userId: null,
			email: null,
			nickname: null,
			preferences: null,
			githubId: null,
			hasPassword: false,
			role: 'user',
			subscription: null,
			serverUrl: DEFAULT_SERVER_URL,
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
			setAuth({
				apiToken,
				userId,
				email: email ?? null,
				nickname: nickname ?? null,
				preferences: preferences ?? null,
				githubId: githubId ?? null,
				hasPassword: hasPassword ?? false,
				role: 'user',
				subscription: null,
				serverUrl: serverUrl || DEFAULT_SERVER_URL,
				isLoaded: true,
			})
		},
		[],
	)

	const logout = useCallback(async () => {
		await authClient.signOut()
		setAuth({
			apiToken: null,
			userId: null,
			email: null,
			nickname: null,
			preferences: null,
			githubId: null,
			hasPassword: false,
			role: 'user',
			subscription: null,
			serverUrl: DEFAULT_SERVER_URL,
			isLoaded: true,
		})
	}, [])

	const refreshUser = useCallback(async () => {
		if (!auth.userId) return null
		try {
			const res = await fetch('/api/user/profile')
			if (!res.ok) return null
			const data = (await res.json()) as {
				email: string | null
				nickname: string | null
				preferences: UserPreferences | null
				githubId: string | null
				hasPassword: boolean
				role: 'user' | 'admin'
				subscription: UserSubscription
			}
			setAuth(prev => ({
				...prev,
				email: data.email,
				nickname: data.nickname,
				preferences: data.preferences,
				githubId: data.githubId,
				hasPassword: data.hasPassword,
				role: data.role,
				subscription: data.subscription,
			}))
			return data
		} catch {
			return null
		}
	}, [auth.userId])

	return {
		...auth,
		isAuthed: !!auth.userId,
		login,
		logout,
		refreshUser,
	}
}
