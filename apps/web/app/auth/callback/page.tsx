'use client'
import {useRouter, useSearchParams} from 'next/navigation'
import {CircleIcon} from '@phosphor-icons/react'
import {useAuth} from '../../hooks/useAuth'
import {Suspense, useEffect} from 'react'

function Callback() {
	const searchParams = useSearchParams()
	const {login} = useAuth()
	const router = useRouter()

	useEffect(() => {
		const token = searchParams.get('token')
		const userId = searchParams.get('userId')
		if (token && userId) {
			login(token, userId)
			router.replace('/dashboard')
		} else {
			router.replace('/login?error=oauth_failed')
		}
	}, [searchParams, login, router])

	return (
		<div className="flex flex-col items-center gap-4">
			<CircleIcon
				size={32}
				weight="duotone"
				className="text-kumo-inactive animate-spin"
			/>
			<p className="text-kumo-secondary text-sm">Signing you in…</p>
		</div>
	)
}

export default function AuthCallbackPage() {
	return (
		<div className="min-h-screen bg-kumo-elevated flex items-center justify-center">
			<Suspense
				fallback={
					<CircleIcon
						size={32}
						weight="duotone"
						className="text-kumo-inactive animate-spin"
					/>
				}
			>
				<Callback />
			</Suspense>
		</div>
	)
}
