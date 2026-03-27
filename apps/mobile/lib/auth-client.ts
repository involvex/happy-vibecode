import {expoClient} from '@better-auth/expo/client'
import {createAuthClient} from 'better-auth/react'
import * as SecureStore from 'expo-secure-store'

export const authClient = createAuthClient({
	baseURL: 'https://happy-vibecode.involvex.workers.dev',
	basePath: '/api/auth',
	plugins: [
		expoClient({
			scheme: 'happy-vibecode',
			storage: SecureStore,
		}),
	],
})
