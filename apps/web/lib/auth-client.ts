'use client'
import {inferAdditionalFields} from 'better-auth/client/plugins'
import {createAuthClient} from 'better-auth/react'
import type {createAuth} from '../worker/auth'

export const authClient = createAuthClient({
	baseURL:
		typeof window !== 'undefined'
			? window.location.origin
			: 'https://happy-vibecode.involvex.workers.dev',
	basePath: '/api/auth',
	plugins: [inferAdditionalFields<ReturnType<typeof createAuth>>()],
})
