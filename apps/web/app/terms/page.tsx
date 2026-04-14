import {Button} from '@cloudflare/kumo'
import Image from 'next/image'
import Link from 'next/link'

export default function TermsPage() {
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
					Terms of Service
				</h1>
				<div className="space-y-6 text-kumo-secondary">
					<p className="text-sm text-kumo-inactive">
						Last updated: March 26, 2026
					</p>

					<section className="space-y-3">
						<h2 className="text-xl font-semibold text-kumo-default">
							1. Acceptance of Terms
						</h2>
						<p>
							By accessing or using Happy Vibecode (&quot;the Service&quot;),
							you agree to be bound by these Terms of Service. If you do not
							agree to these terms, do not use the Service.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-xl font-semibold text-kumo-default">
							2. Description of Service
						</h2>
						<p>
							Happy Vibecode provides a remote control platform for local AI
							agents. The Service connects CLI-based AI agents (such as Gemini
							CLI, Claude, or Codex) to web and mobile interfaces via a
							WebSocket bridge powered by Cloudflare Workers.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-xl font-semibold text-kumo-default">
							3. User Accounts
						</h2>
						<p>
							You are responsible for maintaining the security of your account
							and credentials. You agree not to share your authentication tokens
							or API keys with unauthorized third parties.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-xl font-semibold text-kumo-default">
							4. Acceptable Use
						</h2>
						<p>
							You agree not to use the Service for any unlawful purpose, to
							interfere with the operation of the Service, or to attempt to gain
							unauthorized access to any systems or networks connected to the
							Service.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-xl font-semibold text-kumo-default">
							5. Limitation of Liability
						</h2>
						<p>
							The Service is provided &quot;as is&quot; without warranties of
							any kind. In no event shall Happy Vibecode be liable for any
							indirect, incidental, or consequential damages arising from your
							use of the Service.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-xl font-semibold text-kumo-default">
							6. Changes to Terms
						</h2>
						<p>
							We reserve the right to modify these terms at any time. Continued
							use of the Service after changes constitutes acceptance of the
							updated terms.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-xl font-semibold text-kumo-default">
							7. Contact
						</h2>
						<p>
							For questions about these Terms,{' '}
							<Link
								href="/privacy"
								className="underline text-kumo-accent"
							>
								review our Privacy Policy
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
