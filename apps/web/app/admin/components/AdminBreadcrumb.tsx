'use client'
import {CaretRightIcon} from '@phosphor-icons/react'
import Link from 'next/link'

interface BreadcrumbItem {
	label: string
	href?: string
}

export function AdminBreadcrumb({items}: {items: BreadcrumbItem[]}) {
	return (
		<nav className="flex items-center gap-1 text-sm text-kumo-secondary">
			<Link href="/admin" className="hover:text-kumo-default transition-colors">
				Admin
			</Link>
			{items.map((item, i) => (
				<span key={i} className="flex items-center gap-1">
					<CaretRightIcon size={12} className="text-kumo-inactive" />
					{item.href ? (
						<Link
							href={item.href}
							className="hover:text-kumo-default transition-colors"
						>
							{item.label}
						</Link>
					) : (
						<span className="text-kumo-default font-medium">{item.label}</span>
					)}
				</span>
			))}
		</nav>
	)
}
