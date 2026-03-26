'use client'
import {HeartIcon, CoffeeIcon, GithubLogoIcon} from '@phosphor-icons/react'
import {Button} from '@cloudflare/kumo'
import Image from 'next/image'
import Link from 'next/link'

const DONATION_LINKS = [
	{
		name: 'Buy Me a Coffee',
		description: 'Support the project with a one-time donation.',
		url: 'https://buymeacoffee.com/involvex',
		icon: <CoffeeIcon size={32} weight="duotone" />,
	},
	{
		name: 'PayPal',
		description: 'Send a donation via PayPal.',
		url: 'https://paypal.me/involvex',
		icon: <HeartIcon size={32} weight="duotone" />,
	},
	{
		name: 'GitHub Sponsors',
		description: 'Sponsor the project on GitHub.',
		url: 'https://github.com/sponsors/involvex',
		icon: <GithubLogoIcon size={32} weight="duotone" />,
	},
]

export default function FundingPage() {
	return (
		<div className="min-h-screen bg-kumo-elevated">
			{/* Header */}
			<header className="px-6 py-4 border-b bg-kumo-base border-kumo-line">
				<div className="flex items-center justify-between max-w-5xl mx-auto">
					<Link
						href="/"
						className="flex items-center gap-2 mr-6 font-semibold text-kumo-default"
					>
						<div className="flex items-center gap-2 text-lg font-bold text-kumo-default">
							<Image src="/icon.png" alt="icon" width="35" height="35" /> Happy
							Vibecode
						</div>
					</Link>
					<div className="flex items-center gap-3">
						<Link href="/login">
							<Button variant="secondary" size="sm">
								Sign In
							</Button>
						</Link>
						<Link href="/login">
							<Button variant="primary" size="sm">
								Get Started
							</Button>
						</Link>
					</div>
				</div>
			</header>

			<div className="max-w-3xl px-6 py-16 mx-auto">
				<div className="mb-12 text-center">
					<h1 className="mb-4 text-4xl font-bold text-kumo-default">
						Support Happy Vibecode
					</h1>
					<p className="text-lg text-kumo-secondary">
						Happy Vibecode is an open-source project. Your support helps
						maintain and improve the platform.
					</p>
				</div>

				<div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
					{DONATION_LINKS.map(link => (
						<a
							key={link.name}
							href={link.url}
							target="_blank"
							rel="noopener noreferrer"
							className="flex flex-col items-center gap-4 p-8 text-center transition-colors border rounded-2xl border-kumo-line bg-kumo-elevated hover:border-kumo-accent"
						>
							<div className="text-kumo-accent">{link.icon}</div>
							<div>
								<h3 className="mb-1 font-semibold text-kumo-default">
									{link.name}
								</h3>
								<p className="text-sm text-kumo-secondary">
									{link.description}
								</p>
							</div>
						</a>
					))}
				</div>
			</div>
		</div>
	)
}
