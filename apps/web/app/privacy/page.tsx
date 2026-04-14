import {Button} from '@cloudflare/kumo'
import Image from 'next/image'
import Link from 'next/link'

export default function PrivacyPage() {
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

			<div className="max-w-3xl px-6 py-16 mx-auto">
				<h1 className="mb-8 text-4xl font-bold text-kumo-default">
					Privacy Policy
				</h1>
				<div className="space-y-6 text-kumo-secondary">
					<p className="text-sm text-kumo-inactive">
						Last updated: March 26, 2026
					</p>

					<section className="space-y-3">
						<h2 className="text-xl font-semibold text-kumo-default">
							1. Information We Collect
						</h2>
						<p>
							Happy Vibecode collects minimal information required to provide
							the Service:
						</p>
						<ul className="pl-6 space-y-1 list-disc">
							<li>Account information (email, authentication provider ID)</li>
							<li>Device and browser metadata for session management</li>
							<li>
								AI agent interaction data needed for remote control
								functionality
							</li>
						</ul>
					</section>

					<section className="space-y-3">
						<h2 className="text-xl font-semibold text-kumo-default">
							2. How We Use Your Information
						</h2>
						<p>We use collected information to:</p>
						<ul className="pl-6 space-y-1 list-disc">
							<li>Authenticate and authorize access to your local AI agents</li>
							<li>Route WebSocket connections between devices and agents</li>
							<li>Improve the reliability and security of the Service</li>
						</ul>
					</section>

					<section className="space-y-3">
						<h2 className="text-xl font-semibold text-kumo-default">
							3. Data Storage
						</h2>
						<p>
							User data is stored on Cloudflare infrastructure (D1, KV, Durable
							Objects). Agent interactions are processed at the edge and are not
							permanently stored unless explicitly configured.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-xl font-semibold text-kumo-default">
							4. Third-Party Services
						</h2>
						<p>
							The Service runs on Cloudflare Workers. Authentication is provided
							through third-party identity providers. We do not sell your data
							to third parties.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-xl font-semibold text-kumo-default">
							5. Your Rights
						</h2>
						<p>
							You may request deletion of your account and associated data at
							any time. You retain full control over your local AI agents and
							the data they process.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-xl font-semibold text-kumo-default">
							6. Contact
						</h2>
						<p>
							For privacy-related inquiries,{' '}
							<Link
								href="/terms"
								className="underline text-kumo-accent"
							>
								review our Terms of Service
							</Link>{' '}
							or reach out through{' '}
							<a
								href="https://github.com/involvex/happy-vibecode"
								className="underline text-kumo-accent"
								target="_blank"
								rel="noopener noreferrer"
							>
								our GitHub repository
							</a>
							.
						</p>
					</section>
				</div>
			</div>
		</div>
	)
}
