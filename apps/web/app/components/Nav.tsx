'use client'
import {
	GearSixIcon,
	HouseIcon,
	ChatCircleDotsIcon,
	ClockIcon,
	CloudIcon,
	SignOutIcon,
} from '@phosphor-icons/react'
import {usePathname} from 'next/navigation'
import Link from 'next/link'

interface NavItem {
	href: string
	label: string
	icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
	{href: '/dashboard', label: 'Dashboard', icon: <HouseIcon size={18} />},
	{href: '/chat', label: 'Chat', icon: <ChatCircleDotsIcon size={18} />},
	{href: '/history', label: 'History', icon: <ClockIcon size={18} />},
	{href: '/settings', label: 'Settings', icon: <GearSixIcon size={18} />},
]

interface NavProps {
	onLogout?: () => void
}

export function Nav({onLogout}: NavProps) {
	const pathname = usePathname()

	return (
		<nav className="flex items-center gap-1 px-4 py-3 bg-kumo-base border-b border-kumo-line">
			{/* Logo */}
			<Link
				href="/dashboard"
				className="flex items-center gap-2 mr-6 text-kumo-default font-semibold"
			>
				<CloudIcon size={20} weight="duotone" />
				<span>Happy Vibecode</span>
			</Link>

			{/* Nav links */}
			<div className="flex items-center gap-1 flex-1">
				{NAV_ITEMS.map(item => {
					const active = pathname === item.href
					return (
						<Link
							key={item.href}
							href={item.href}
							className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
								active
									? 'bg-kumo-contrast text-kumo-inverse'
									: 'text-kumo-secondary hover:text-kumo-default hover:bg-kumo-hover'
							}`}
						>
							{item.icon}
							{item.label}
						</Link>
					)
				})}
			</div>

			{/* Logout */}
			{onLogout && (
				<button
					onClick={onLogout}
					className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-kumo-secondary hover:text-kumo-danger hover:bg-kumo-hover transition-colors"
				>
					<SignOutIcon size={16} />
					Logout
				</button>
			)}
		</nav>
	)
}
