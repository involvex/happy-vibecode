'use client'
import {
	ChartBarIcon,
	RobotIcon,
	ShieldCheckIcon,
	UsersIcon,
	ClockCounterClockwiseIcon,
	UsersThreeIcon,
	ListIcon,
	XIcon,
	CaretLeftIcon,
	CaretRightIcon,
	HouseIcon,
} from '@phosphor-icons/react'
import {usePathname} from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

interface SidebarItem {
	href: string
	label: string
	icon: React.ReactNode
}

const SIDEBAR_ITEMS: SidebarItem[] = [
	{href: '/admin', label: 'Overview', icon: <HouseIcon size={18} />},
	{href: '/admin/users', label: 'Users', icon: <UsersIcon size={18} />},
	{href: '/admin/roles', label: 'Roles', icon: <ShieldCheckIcon size={18} />},
	{href: '/admin/agents', label: 'Agents', icon: <RobotIcon size={18} />},
	{
		href: '/admin/analytics',
		label: 'Analytics',
		icon: <ChartBarIcon size={18} />,
	},
	{
		href: '/admin/audit',
		label: 'Audit Log',
		icon: <ClockCounterClockwiseIcon size={18} />,
	},
]

interface AdminSidebarProps {
	collapsed: boolean
	onToggle: () => void
	mobileOpen: boolean
	onMobileToggle: () => void
}

export function AdminSidebar({
	collapsed,
	onToggle,
	mobileOpen,
	onMobileToggle,
}: AdminSidebarProps) {
	const pathname = usePathname()

	const sidebarClasses = collapsed ? 'w-16' : 'w-64'

	return (
		<>
			{/* Mobile overlay */}
			{mobileOpen && (
				<div
					className="fixed inset-0 bg-black/50 z-40 lg:hidden"
					onClick={onMobileToggle}
				/>
			)}

			{/* Sidebar */}
			<aside
				className={`fixed top-0 left-0 h-full bg-kumo-base border-r border-kumo-line z-50 transition-all duration-200 flex flex-col ${sidebarClasses} ${
					mobileOpen ? 'translate-x-0' : '-translate-x-full'
				} lg:translate-x-0`}
			>
				{/* Header */}
				<div className="flex items-center justify-between px-4 py-3 border-b border-kumo-line">
					{!collapsed && (
						<Link href="/admin" className="flex items-center gap-2">
							<Image src="/icon.png" alt="icon" width={28} height={28} />
							<span className="font-semibold text-kumo-default text-sm">
								Admin Panel
							</span>
						</Link>
					)}
					{collapsed && (
						<Link href="/admin" className="mx-auto">
							<Image src="/icon.png" alt="icon" width={24} height={24} />
						</Link>
					)}
					<button
						type="button"
						onClick={onMobileToggle}
						className="p-1.5 rounded-lg text-kumo-secondary hover:text-kumo-default hover:bg-kumo-hover transition-colors lg:hidden"
					>
						<XIcon size={18} />
					</button>
				</div>

				{/* Navigation */}
				<nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
					{!collapsed && (
						<p className="px-3 py-1.5 text-xs font-semibold text-kumo-inactive uppercase tracking-wider">
							Navigation
						</p>
					)}
					{SIDEBAR_ITEMS.map(item => {
						const active =
							item.href === '/admin'
								? pathname === '/admin'
								: pathname.startsWith(item.href)
						return (
							<Link
								key={item.href}
								href={item.href}
								onClick={() => {
									if (mobileOpen) onMobileToggle()
								}}
								className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
									active
										? 'bg-kumo-contrast text-kumo-inverse'
										: 'text-kumo-secondary hover:text-kumo-default hover:bg-kumo-hover'
								} ${collapsed ? 'justify-center' : ''}`}
								title={collapsed ? item.label : undefined}
							>
								{item.icon}
								{!collapsed && <span>{item.label}</span>}
							</Link>
						)
					})}
				</nav>

				{/* Collapse toggle (desktop only) */}
				<div className="hidden lg:block border-t border-kumo-line p-2">
					<button
						type="button"
						onClick={onToggle}
						className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm text-kumo-secondary hover:text-kumo-default hover:bg-kumo-hover transition-colors"
					>
						{collapsed ? (
							<CaretRightIcon size={16} />
						) : (
							<CaretLeftIcon size={16} />
						)}
						{!collapsed && <span>Collapse</span>}
					</button>
				</div>

				{/* Back to app link */}
				<div className="border-t border-kumo-line p-2">
					<Link
						href="/dashboard"
						className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-kumo-secondary hover:text-kumo-default hover:bg-kumo-hover transition-colors ${collapsed ? 'justify-center' : ''}`}
						title={collapsed ? 'Back to App' : undefined}
					>
						<UsersThreeIcon size={18} />
						{!collapsed && <span>Back to App</span>}
					</Link>
				</div>
			</aside>
		</>
	)
}

export function AdminMobileMenuButton({onClick}: {onClick: () => void}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="lg:hidden fixed top-3 left-3 z-30 p-2 rounded-lg bg-kumo-base border border-kumo-line text-kumo-secondary hover:text-kumo-default transition-colors"
			aria-label="Open admin menu"
		>
			<ListIcon size={20} />
		</button>
	)
}
