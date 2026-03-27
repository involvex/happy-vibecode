'use client'
import {CircleIcon} from '@phosphor-icons/react'
import {useRouter} from 'next/navigation'
import {Suspense, useEffect} from 'react'

function Callback() {
	const router = useRouter()

	useEffect(() => {
		// Better Auth handles the OAuth exchange at the worker level and redirects
		// here with the session already established. Just navigate to dashboard.
		router.replace('/dashboard')
	}, [router])

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
