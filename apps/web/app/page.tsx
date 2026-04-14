'use client'
import {
	ChatCircleDotsIcon,
	CircleIcon,
	LightningIcon,
	TerminalWindowIcon,
	WifiHighIcon,
} from '@phosphor-icons/react'
import {useEffect, useState} from 'react'
import {Button} from '@cloudflare/kumo'
import {useAuth} from './hooks/useAuth'
import Image from 'next/image'
import Link from 'next/link'
// import '../public/icon.svg' with {as: 'svg'}

interface Feature {
	icon: React.ReactNode
	title: string
	desc: string
}

const FEATURES: Feature[] = [
	{
		icon: (
			<WifiHighIcon
				size={24}
				weight="duotone"
			/>
		),
		title: 'Remote Control',
		desc: 'Control your local AI agents from anywhere in the world.',
	},
	{
		icon: (
			<LightningIcon
				size={24}
				weight="duotone"
			/>
		),
		title: 'Real-time Streaming',
		desc: 'WebSocket bridge for instant, streaming responses.',
	},
	{
		icon: (
			<TerminalWindowIcon
				size={24}
				weight="duotone"
			/>
		),
		title: 'Any CLI Agent',
		desc: 'Works with Gemini, Claude, Codex, or any CLI-based agent.',
	},
	{
		icon: (
			<ChatCircleDotsIcon
				size={24}
				weight="duotone"
			/>
		),
		title: 'Multi-platform',
		desc: 'Access from web, mobile, or any connected device.',
	},
]

export default function HomePage() {
	const {isAuthed, isLoaded} = useAuth()
	const [redirected, setRedirected] = useState(false)

	useEffect(() => {
		if (isLoaded && isAuthed && !redirected) {
			setRedirected(true)
			window.location.href = '/dashboard'
		}
	}, [isLoaded, isAuthed, redirected])

	if (!isLoaded) {
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
		<div className="min-h-screen bg-kumo-elevated">
			{/* Header */}
			<header className="px-6 py-4 border-b bg-kumo-base border-kumo-line">
				<div className="flex items-center justify-between max-w-5xl mx-auto">
					<Link
						href="/"
						className="flex items-center gap-2 mr-6 font-semibold text-kumo-default"
					>
						<div className="flex items-center gap-2 text-lg font-bold text-kumo-default">
							<Image
								src="/icon.png"
								alt="icon"
								width="35"
								height="35"
							/>{' '}
							Happy Vibecode
						</div>
					</Link>
					<div className="flex items-center gap-3">
						<Link href="/login">
							<Button
								variant="secondary"
								size="sm"
							>
								Sign In
							</Button>
						</Link>
						<Link href="/login">
							<Button
								variant="primary"
								size="sm"
							>
								Get Started
							</Button>
						</Link>
					</div>
				</div>
			</header>

			{/* Hero */}
			<section className="px-6 py-20 text-center">
				<div className="max-w-3xl mx-auto">
					<div className="inline-flex items-center gap-2 px-3 py-1 mb-6 text-sm border rounded-full bg-kumo-base border-kumo-line text-kumo-secondary">
						<CircleIcon
							size={8}
							weight="fill"
							className="text-kumo-success"
						/>
						Powered by Cloudflare Workers
					</div>
					<h1 className="mb-6 text-5xl font-extrabold tracking-tight text-kumo-default">
						Remote control for{' '}
						<span className="text-kumo-accent">local AI agents</span>
					</h1>
					<p className="mb-10 text-xl leading-relaxed text-kumo-secondary">
						Connect Gemini CLI, Claude, or any local agent to your web browser
						or mobile device — from anywhere.
					</p>
					<div className="flex flex-wrap items-center justify-center gap-3">
						<Link href="/login">
							<Button
								variant="primary"
								size="lg"
							>
								Start for free
							</Button>
						</Link>
					</div>
				</div>
			</section>

			{/* Quick start */}
			<section className="px-6 pb-20">
				<div className="max-w-2xl mx-auto">
					<div className="p-6 border bg-kumo-base border-kumo-line rounded-2xl">
						<h2 className="mb-4 text-lg font-semibold text-kumo-default">
							Quick start
						</h2>
						<div className="space-y-3 font-mono text-sm">
							{[
								{step: '1', cmd: 'bun install -g @happy-vibecode/cli'},
								{step: '2', cmd: 'happy-vibecode login'},
								{step: '3', cmd: 'happy-vibecode connect gemini'},
							].map(({step, cmd}) => (
								<div
									key={step}
									className="flex items-center gap-3"
								>
									<span className="flex items-center justify-center flex-none w-6 h-6 font-sans text-xs font-medium rounded-full bg-kumo-control text-kumo-secondary">
										{step}
									</span>
									<code className="text-kumo-accent bg-kumo-control px-3 py-1.5 rounded-lg flex-1">
										$ {cmd}
									</code>
								</div>
							))}
						</div>
					</div>
				</div>
			</section>

			{/* Features */}
			<section className="px-6 pb-24 border-t bg-kumo-base border-kumo-line">
				<div className="max-w-5xl pt-16 mx-auto">
					<h2 className="mb-12 text-3xl font-bold text-center text-kumo-default">
						Everything you need
					</h2>
					<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
						{FEATURES.map(f => (
							<div
								key={f.title}
								className="p-5 border rounded-2xl border-kumo-line bg-kumo-elevated"
							>
								<div className="mb-3 text-kumo-accent">{f.icon}</div>
								<h3 className="mb-1 font-semibold text-kumo-default">
									{f.title}
								</h3>
								<p className="text-sm text-kumo-secondary">{f.desc}</p>
							</div>
						))}
					</div>
				</div>
			</section>
		</div>
	)
}
