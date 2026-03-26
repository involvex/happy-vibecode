'use client'
import {CircleIcon} from '@phosphor-icons/react'
import {useAuth} from '../../hooks/useAuth'
import {useRouter} from 'next/navigation'
import {Suspense, useEffect} from 'react'

function Callback() {
	const {login} = useAuth()
	const router = useRouter()

	useEffect(() => {
		// Read directly from window.location to avoid Next.js router hydration
		// timing issues where useSearchParams() can fire before URL is ready.
		const params = new URLSearchParams(window.location.search)
		const token = params.get('token')
		const userId = params.get('userId')
		if (token && userId) {
			login(token, userId)
			router.replace('/dashboard')
		} else {
			router.replace('/login?error=oauth_failed')
		}
	}, [login, router])

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
