'use client'
import {useRouter, useSearchParams} from 'next/navigation'
import {CircleIcon} from '@phosphor-icons/react'
import {useAuth} from '../hooks/useAuth'
import {Nav} from '../components/Nav'
import dynamic from 'next/dynamic'
import {useEffect} from 'react'

const ChatComponent = dynamic(() => import('./Chat'), {ssr: false})

export default function ChatPage() {
	const {isAuthed, isLoaded, logout} = useAuth()
	const router = useRouter()
	const params = useSearchParams()
	const roomParam = params.get('room') ?? undefined

	useEffect(() => {
		if (isLoaded && !isAuthed) {
			router.replace('/login')
		}
	}, [isLoaded, isAuthed, router])

	const handleLogout = () => {
		logout()
		router.replace('/login')
	}

	if (!isLoaded || !isAuthed) {
		return (
			<div className="flex items-center justify-center h-screen bg-kumo-elevated">
				<CircleIcon
					size={32}
					weight="duotone"
					className="text-kumo-inactive animate-spin"
				/>
			</div>
		)
	}

	return (
		<div className="flex flex-col h-screen bg-kumo-elevated">
			<Nav onLogout={handleLogout} />
			<div className="flex-1 min-h-0">
				<ChatComponent roomId={roomParam} />
			</div>
		</div>
	)
}
