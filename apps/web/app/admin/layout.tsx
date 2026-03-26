'use client'
import {AdminSidebar, AdminMobileMenuButton} from './components/AdminSidebar'
import {CircleIcon} from '@phosphor-icons/react'
import {useRouter} from 'next/navigation'
import {useEffect, useState} from 'react'
import {useAuth} from '../hooks/useAuth'

export default function AdminLayout({children}: {children: React.ReactNode}) {
	const {isAuthed, isLoaded, apiToken} = useAuth()
	const router = useRouter()
	const [collapsed, setCollapsed] = useState(false)
	const [mobileOpen, setMobileOpen] = useState(false)
	const [adminStatusChecked, setAdminStatusChecked] = useState(false)
	const [isAdmin, setIsAdmin] = useState(false)

	useEffect(() => {
		if (isLoaded && !isAuthed) {
			router.replace('/login')
		}
	}, [isLoaded, isAuthed, router])

	useEffect(() => {
		if (!apiToken || !isAuthed) return

		const headers = {Authorization: `Bearer ${apiToken}`}

		Promise.all([
			fetch('/api/user/profile', {headers}).then(
				res => res.json() as Promise<{role: string}>,
			),
			fetch('/api/user/admin-status', {headers}).then(
				res => res.json() as Promise<{isAdmin: boolean}>,
			),
		])
			.then(([profile, status]) => {
				setIsAdmin(profile.role === 'admin' && status.isAdmin)
			})
			.catch(() => {
				setIsAdmin(false)
			})
			.finally(() => setAdminStatusChecked(true))
	}, [apiToken, isAuthed])

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

	if (!adminStatusChecked) {
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

	if (!isAdmin) {
		return (
			<div className="flex flex-col items-center justify-center h-screen bg-kumo-elevated gap-4">
				<p className="text-kumo-default text-lg font-semibold">Access Denied</p>
				<p className="text-kumo-secondary text-sm">
					Admin privileges required.
				</p>
				<button
					type="button"
					onClick={() => router.replace('/dashboard')}
					className="px-4 py-2 bg-kumo-accent text-white rounded-lg text-sm hover:opacity-90 transition-opacity"
				>
					Go to Dashboard
				</button>
			</div>
		)
	}

	const sidebarWidth = collapsed ? 'lg:ml-16' : 'lg:ml-64'

	return (
		<div className="min-h-screen bg-kumo-elevated">
			<AdminSidebar
				collapsed={collapsed}
				onToggle={() => setCollapsed(!collapsed)}
				mobileOpen={mobileOpen}
				onMobileToggle={() => setMobileOpen(!mobileOpen)}
			/>
			<AdminMobileMenuButton onClick={() => setMobileOpen(true)} />
			<main
				className={`transition-all duration-200 ${sidebarWidth} min-h-screen`}
			>
				<div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 pt-16 lg:pt-8">
					{children}
				</div>
			</main>
		</div>
	)
}
