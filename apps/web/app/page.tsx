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
import Link from 'next/link'

interface Feature {
	icon: React.ReactNode
	title: string
	desc: string
}

const FEATURES: Feature[] = [
	{
		icon: <WifiHighIcon size={24} weight="duotone" />,
		title: 'Remote Control',
		desc: 'Control your local AI agents from anywhere in the world.',
	},
	{
		icon: <LightningIcon size={24} weight="duotone" />,
		title: 'Real-time Streaming',
		desc: 'WebSocket bridge for instant, streaming responses.',
	},
	{
		icon: <TerminalWindowIcon size={24} weight="duotone" />,
		title: 'Any CLI Agent',
		desc: 'Works with Gemini, Claude, Codex, or any CLI-based agent.',
	},
	{
		icon: <ChatCircleDotsIcon size={24} weight="duotone" />,
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
			<header className="px-6 py-4 bg-kumo-base border-b border-kumo-line">
				<div className="max-w-5xl mx-auto flex items-center justify-between">
					<div className="flex items-center gap-2 font-bold text-kumo-default text-lg">
						⛅ Happy Vibecode
					</div>
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

			{/* Hero */}
			<section className="px-6 py-20 text-center">
				<div className="max-w-3xl mx-auto">
					<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-kumo-base border border-kumo-line text-sm text-kumo-secondary mb-6">
						<CircleIcon size={8} weight="fill" className="text-kumo-success" />
						Powered by Cloudflare Workers
					</div>
					<h1 className="text-5xl font-extrabold text-kumo-default mb-6 tracking-tight">
						Remote control for{' '}
						<span className="text-kumo-accent">local AI agents</span>
					</h1>
					<p className="text-xl text-kumo-secondary mb-10 leading-relaxed">
						Connect Gemini CLI, Claude, or any local agent to your web browser
						or mobile device — from anywhere.
					</p>
					<div className="flex items-center gap-3 justify-center flex-wrap">
						<Link href="/login">
							<Button variant="primary" size="lg">
								Start for free
							</Button>
						</Link>
					</div>
				</div>
			</section>

			{/* Quick start */}
			<section className="px-6 pb-20">
				<div className="max-w-2xl mx-auto">
					<div className="bg-kumo-base border border-kumo-line rounded-2xl p-6">
						<h2 className="text-lg font-semibold text-kumo-default mb-4">
							Quick start
						</h2>
						<div className="space-y-3 font-mono text-sm">
							{[
								{step: '1', cmd: 'bun install -g @happy-vibecode/cli'},
								{step: '2', cmd: 'happy login'},
								{step: '3', cmd: 'happy connect gemini'},
							].map(({step, cmd}) => (
								<div key={step} className="flex items-center gap-3">
									<span className="flex-none w-6 h-6 rounded-full bg-kumo-control text-kumo-secondary text-xs flex items-center justify-center font-sans font-medium">
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
			<section className="px-6 pb-24 bg-kumo-base border-t border-kumo-line">
				<div className="max-w-5xl mx-auto pt-16">
					<h2 className="text-3xl font-bold text-kumo-default text-center mb-12">
						Everything you need
					</h2>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
						{FEATURES.map(f => (
							<div
								key={f.title}
								className="p-5 rounded-2xl border border-kumo-line bg-kumo-elevated"
							>
								<div className="text-kumo-accent mb-3">{f.icon}</div>
								<h3 className="font-semibold text-kumo-default mb-1">
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
