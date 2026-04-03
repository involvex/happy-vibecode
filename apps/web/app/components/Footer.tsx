'use client'
import {BookOpenIcon, PaypalLogoIcon} from '@phosphor-icons/react'
import Link from 'next/link'

export default function Footer() {
	return (
		<footer
			className="px-6 py-4 mt-4 border-t bg-kumo-elevated border-kumo-line"
			style={{position: 'fixed', bottom: 0, width: '100%'}}
		>
			<div className="flex items-center justify-center gap-2 text-sm text-kumo-secondary">
				<span>
					© {new Date().getFullYear()} Happy Vibecode. All rights reserved.
				</span>
				<span className="mx-1">|</span>
				<Link href="/terms" className="hover:underline">
					Terms of Service
				</Link>
				<span className="mx-1">|</span>
				<Link href="/privacy" className="hover:underline">
					Privacy Policy
				</Link>
				<span className="mx-1">|</span>
				<Link href="/funding" className="hover:underline">
					<PaypalLogoIcon size={16} weight="duotone" /> Funding
				</Link>
				<span className="mx-1">|</span>
				<a
					href="https://involvex.github.io/happy-vibecode/"
					target="_blank"
					rel="noopener noreferrer"
					className="hover:underline"
				>
					<BookOpenIcon size={16} weight="duotone" /> Docs
				</a>
			</div>
		</footer>
	)
}
