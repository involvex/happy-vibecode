'use client'
import {
	GearSixIcon,
	HouseIcon,
	ChatCircleDotsIcon,
	ClockIcon,
	// CloudIcon,
	SignOutIcon,
	UserIcon,
} from '@phosphor-icons/react'
import {usePathname} from 'next/navigation'
import Image from 'next/image'
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
	{href: '/profile', label: 'Profile', icon: <UserIcon size={18} />},
	{href: '/settings', label: 'Settings', icon: <GearSixIcon size={18} />},
]

interface NavProps {
	onLogout?: () => void
}

export function Nav({onLogout}: NavProps) {
	const pathname = usePathname()

	return (
		<nav
			className="flex items-center gap-1 px-4 py-3 border-b bg-kumo-base border-kumo-line"
			style={{position: 'sticky', top: 0, zIndex: 100}}
		>
			{/* Logo */}
			<Link
				href="/dashboard"
				className="flex items-center gap-2 mr-6 font-semibold text-kumo-default"
			>
				<Image src="/icon.png" alt="icon" width="35" height="35" />
				<span>Happy Vibecode</span>
			</Link>

			{/* Nav links */}
			<div className="flex items-center flex-1 gap-1">
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
					type="button"
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
