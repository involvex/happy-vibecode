'use client'
import {
	CircleIcon,
	ChatCircleDotsIcon,
	ArrowLeftIcon,
	CheckIcon,
	XIcon,
	EnvelopeSimpleIcon,
} from '@phosphor-icons/react'
import {useEffect, useRef, useState, useCallback} from 'react'
import {zodResolver} from '@hookform/resolvers/zod'
import {Button, Text} from '@cloudflare/kumo'
import {useRouter} from 'next/navigation'
import {useAuth} from '../hooks/useAuth'
import {useForm} from 'react-hook-form'
import {Nav} from '../components/Nav'
import {z} from 'zod'

const TOPICS = [
	{value: 'bug', label: 'Bug Report'},
	{value: 'feature', label: 'Feature Request'},
	{value: 'billing', label: 'Billing'},
	{value: 'general', label: 'General'},
	{value: 'other', label: 'Other'},
] as const

const createTicketSchema = z.object({
	title: z.string().min(1, 'Title is required').max(200),
	topic: z.enum(['bug', 'feature', 'billing', 'general', 'other']),
	message: z.string().min(1, 'Message is required').max(5000),
})

type CreateTicketForm = z.infer<typeof createTicketSchema>

interface TicketListItem {
	id: string
	userId?: string
	title: string
	topic: string
	status: 'open' | 'closed'
	userEmail?: string | null
	createdAt: string
	updatedAt: string
}

interface TicketResponse {
	id: string
	userId: string
	message: string
	createdAt: string
}

interface TicketDetail extends TicketListItem {
	responses: TicketResponse[]
	userEmail: string | null
}

declare global {
	interface Window {
		turnstile?: {
			render: (
				el: HTMLElement,
				opts: {sitekey: string; callback: (token: string) => void},
			) => number
			reset: (id: number) => void
		}
	}
}

export default function ContactPage() {
	const {isAuthed, isLoaded, apiToken, userId, role, logout} = useAuth()
	const router = useRouter()

	const [tickets, setTickets] = useState<TicketListItem[]>([])
	const [loading, setLoading] = useState(true)
	const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(
		null,
	)
	const [showCreateForm, setShowCreateForm] = useState(false)
	const [createError, setCreateError] = useState('')
	const [createSuccess, setCreateSuccess] = useState('')
	const [turnstileToken, setTurnstileToken] = useState('')
	const [turnstileSiteKey, setTurnstileSiteKey] = useState('')
	const [replyText, setReplyText] = useState('')
	const [replyError, setReplyError] = useState('')
	const turnstileRef = useRef<HTMLDivElement>(null)
	const widgetIdRef = useRef<number | null>(null)

	const isAdmin = role === 'admin'

	const ticketForm = useForm<CreateTicketForm>({
		resolver: zodResolver(createTicketSchema),
		defaultValues: {title: '', topic: 'general', message: ''},
	})

	const fetchTickets = useCallback(async () => {
		if (!apiToken) return
		setLoading(true)
		try {
			const url = isAdmin ? '/api/tickets/admin/all' : '/api/tickets'
			const res = await fetch(url, {
				headers: {Authorization: `Bearer ${apiToken}`},
			})
			if (res.ok) {
				const data = (await res.json()) as {tickets: TicketListItem[]}
				setTickets(data.tickets ?? [])
			}
		} finally {
			setLoading(false)
		}
	}, [apiToken, isAdmin])

	useEffect(() => {
		if (isLoaded && !isAuthed) {
			router.replace('/login')
		}
	}, [isLoaded, isAuthed, router])

	useEffect(() => {
		if (!apiToken) return
		fetchTickets()
	}, [apiToken, fetchTickets])

	useEffect(() => {
		fetch('/api/config/turnstile')
			.then(r => r.json() as Promise<{siteKey: string}>)
			.then(data => setTurnstileSiteKey(data.siteKey))
			.catch(() => {})
	}, [])

	useEffect(() => {
		if (!showCreateForm || !turnstileSiteKey) return

		let timeoutId: ReturnType<typeof setTimeout> | null = null
		const script = document.createElement('script')
		script.src = 'https://challenges.cloudflare.com/turnstile/v0.js'
		script.async = true
		script.defer = true
		script.onload = () => {
			if (turnstileRef.current && window.turnstile) {
				widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
					sitekey: turnstileSiteKey,
					callback: (token: string) => {
						if (timeoutId) clearTimeout(timeoutId)
						setTurnstileToken(token)
					},
				} as Parameters<typeof window.turnstile.render>[1])
			}
			timeoutId = setTimeout(() => {
				if (!turnstileToken) {
					setTurnstileToken('turnstile-timeout')
				}
			}, 10000)
		}
		script.onerror = () => {
			setTurnstileToken('turnstile-error')
		}
		document.head.appendChild(script)
		return () => {
			if (timeoutId) clearTimeout(timeoutId)
			if (widgetIdRef.current !== null && window.turnstile) {
				window.turnstile.reset(widgetIdRef.current)
			}
		}
	}, [showCreateForm, turnstileSiteKey, turnstileToken])

	async function fetchTicketDetail(id: string) {
		if (!apiToken) return
		try {
			const res = await fetch(`/api/tickets/${id}`, {
				headers: {Authorization: `Bearer ${apiToken}`},
			})
			if (res.ok) {
				const data = (await res.json()) as TicketDetail
				setSelectedTicket(data)
			}
		} catch {
			/* empty */
		}
	}

	async function handleCreate(data: CreateTicketForm) {
		if (!apiToken) return
		setCreateError('')
		setCreateSuccess('')
		try {
			const validToken =
				turnstileToken &&
				turnstileToken !== 'turnstile-error' &&
				turnstileToken !== 'turnstile-timeout'
					? turnstileToken
					: undefined
			const res = await fetch('/api/tickets', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${apiToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					...data,
					turnstileToken: validToken,
				}),
			})
			if (!res.ok) {
				const err = (await res.json()) as {error?: string}
				throw new Error(err.error ?? 'Failed to create ticket')
			}
			setCreateSuccess('Ticket created successfully!')
			ticketForm.reset()
			setShowCreateForm(false)
			setTurnstileToken('')
			if (widgetIdRef.current !== null && window.turnstile) {
				window.turnstile.reset(widgetIdRef.current)
			}
			fetchTickets()
			setTimeout(() => setCreateSuccess(''), 3000)
		} catch (err) {
			setCreateError((err as Error).message)
		}
	}

	async function handleReply() {
		if (!apiToken || !selectedTicket || !replyText.trim()) return
		setReplyError('')
		try {
			const res = await fetch(`/api/tickets/${selectedTicket.id}/responses`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${apiToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({message: replyText}),
			})
			if (!res.ok) {
				const err = (await res.json()) as {error?: string}
				throw new Error(err.error ?? 'Failed to send reply')
			}
			setReplyText('')
			fetchTicketDetail(selectedTicket.id)
		} catch (err) {
			setReplyError((err as Error).message)
		}
	}

	async function handleStatusToggle(
		ticketId: string,
		newStatus: 'open' | 'closed',
	) {
		if (!apiToken) return
		try {
			const res = await fetch(`/api/tickets/${ticketId}/status`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${apiToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({status: newStatus}),
			})
			if (res.ok) {
				fetchTickets()
				if (selectedTicket?.id === ticketId) {
					fetchTicketDetail(ticketId)
				}
			}
		} catch {
			/* empty */
		}
	}

	const handleLogout = () => {
		logout()
		router.replace('/login')
	}

	if (!isLoaded || !isAuthed) {
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

	const timeAgo = (iso: string) => {
		const diff = Date.now() - new Date(iso).getTime()
		const mins = Math.floor(diff / 60000)
		if (mins < 1) return 'just now'
		if (mins < 60) return `${mins}m ago`
		const hrs = Math.floor(mins / 60)
		if (hrs < 24) return `${hrs}h ago`
		return `${Math.floor(hrs / 24)}d ago`
	}

	// Ticket detail view
	if (selectedTicket) {
		return (
			<div className="min-h-screen bg-kumo-elevated">
				<Nav onLogout={handleLogout} />
				<main className="max-w-3xl mx-auto px-6 py-10">
					<button
						type="button"
						onClick={() => setSelectedTicket(null)}
						className="flex items-center gap-1.5 text-sm text-kumo-secondary hover:text-kumo-default mb-6 transition-colors"
					>
						<ArrowLeftIcon size={16} />
						Back to tickets
					</button>

					<div className="bg-kumo-base border border-kumo-line rounded-2xl p-6 space-y-4">
						<div className="flex items-start justify-between gap-4">
							<div>
								<h1 className="text-xl font-bold text-kumo-default">
									{selectedTicket.title}
								</h1>
								<div className="flex items-center gap-3 mt-2 text-xs text-kumo-secondary">
									<span className="capitalize">{selectedTicket.topic}</span>
									<span>{timeAgo(selectedTicket.createdAt)}</span>
									{isAdmin && selectedTicket.userEmail && (
										<span>{selectedTicket.userEmail}</span>
									)}
								</div>
							</div>
							<div className="flex items-center gap-2">
								<span
									className={`text-xs font-medium px-2.5 py-1 rounded-full ${
										selectedTicket.status === 'open'
											? 'bg-kumo-success/15 text-kumo-success'
											: 'bg-kumo-control text-kumo-secondary'
									}`}
								>
									{selectedTicket.status}
								</span>
								{isAdmin && (
									<Button
										variant="secondary"
										size="sm"
										onClick={() =>
											handleStatusToggle(
												selectedTicket.id,
												selectedTicket.status === 'open' ? 'closed' : 'open',
											)
										}
									>
										{selectedTicket.status === 'open' ? (
											<>
												<XIcon size={14} /> Close
											</>
										) : (
											<>
												<CheckIcon size={14} /> Reopen
											</>
										)}
									</Button>
								)}
							</div>
						</div>
					</div>

					{/* Responses */}
					<div className="mt-6 space-y-4">
						{selectedTicket.responses.map(response => (
							<div
								key={response.id}
								className={`bg-kumo-base border border-kumo-line rounded-2xl p-5 ${
									response.userId === userId ? 'ml-8' : 'mr-8'
								}`}
							>
								<div className="flex items-center gap-2 mb-2 text-xs text-kumo-secondary">
									<span className="font-medium">
										{response.userId === userId
											? 'You'
											: isAdmin
												? 'User'
												: 'Support'}
									</span>
									<span>{timeAgo(response.createdAt)}</span>
								</div>
								<p className="text-sm text-kumo-default whitespace-pre-wrap">
									{response.message}
								</p>
							</div>
						))}
					</div>

					{/* Reply form */}
					{selectedTicket.status === 'open' && (
						<div className="mt-6 bg-kumo-base border border-kumo-line rounded-2xl p-5 space-y-3">
							<textarea
								value={replyText}
								onChange={e => setReplyText(e.target.value)}
								placeholder="Type your reply..."
								rows={3}
								className="w-full px-3 py-2 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default placeholder-kumo-inactive focus:outline-none focus:ring-2 focus:ring-kumo-ring focus:border-transparent resize-none"
							/>
							{replyError && (
								<p className="text-xs text-kumo-danger">{replyError}</p>
							)}
							<Button
								variant="primary"
								size="sm"
								onClick={handleReply}
								disabled={!replyText.trim()}
							>
								<ChatCircleDotsIcon size={14} />
								Send Reply
							</Button>
						</div>
					)}
				</main>
			</div>
		)
	}

	// Main ticket list view
	return (
		<div className="min-h-screen bg-kumo-elevated">
			<Nav onLogout={handleLogout} />

			<main className="max-w-3xl mx-auto px-6 py-10">
				<div className="flex items-center justify-between mb-6">
					<h1 className="text-2xl font-bold text-kumo-default">
						{isAdmin ? 'All Tickets' : 'Contact Support'}
					</h1>
					{!showCreateForm && (
						<Button
							variant="primary"
							size="sm"
							onClick={() => setShowCreateForm(true)}
						>
							New Ticket
						</Button>
					)}
				</div>

				{createSuccess && (
					<div className="text-sm text-kumo-success bg-kumo-success/10 border border-kumo-success/20 rounded-lg px-3 py-2 mb-4">
						{createSuccess}
					</div>
				)}

				{/* Create ticket form */}
				{showCreateForm && (
					<div className="bg-kumo-base border border-kumo-line rounded-2xl p-6 mb-6 space-y-4">
						<div className="flex items-center justify-between">
							<h2 className="text-lg font-semibold text-kumo-default">
								New Ticket
							</h2>
							<button
								type="button"
								onClick={() => {
									setShowCreateForm(false)
									setCreateError('')
									ticketForm.reset()
								}}
								className="text-kumo-secondary hover:text-kumo-default"
							>
								<XIcon size={20} />
							</button>
						</div>

						<form
							onSubmit={ticketForm.handleSubmit(handleCreate)}
							className="space-y-4"
						>
							<div>
								<label
									htmlFor="ticket-title"
									className="block text-sm font-medium text-kumo-secondary mb-1.5"
								>
									Title
								</label>
								<input
									id="ticket-title"
									type="text"
									placeholder="Brief summary of your issue"
									maxLength={200}
									{...ticketForm.register('title')}
									className="w-full px-3 py-2 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default placeholder-kumo-inactive focus:outline-none focus:ring-2 focus:ring-kumo-ring focus:border-transparent"
								/>
								{ticketForm.formState.errors.title && (
									<p className="text-xs text-kumo-danger mt-1">
										{ticketForm.formState.errors.title.message}
									</p>
								)}
							</div>

							<div>
								<label
									htmlFor="ticket-topic"
									className="block text-sm font-medium text-kumo-secondary mb-1.5"
								>
									Topic
								</label>
								<select
									id="ticket-topic"
									{...ticketForm.register('topic')}
									className="w-full px-3 py-2 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default focus:outline-none focus:ring-2 focus:ring-kumo-ring focus:border-transparent"
								>
									{TOPICS.map(t => (
										<option key={t.value} value={t.value}>
											{t.label}
										</option>
									))}
								</select>
							</div>

							<div>
								<label
									htmlFor="ticket-message"
									className="block text-sm font-medium text-kumo-secondary mb-1.5"
								>
									Message
								</label>
								<textarea
									id="ticket-message"
									placeholder="Describe your issue in detail..."
									rows={4}
									maxLength={5000}
									{...ticketForm.register('message')}
									className="w-full px-3 py-2 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default placeholder-kumo-inactive focus:outline-none focus:ring-2 focus:ring-kumo-ring focus:border-transparent resize-none"
								/>
								{ticketForm.formState.errors.message && (
									<p className="text-xs text-kumo-danger mt-1">
										{ticketForm.formState.errors.message.message}
									</p>
								)}
							</div>

							<div ref={turnstileRef} />

							{createError && (
								<p className="text-xs text-kumo-danger">{createError}</p>
							)}

							<div className="flex gap-3">
								<Button
									type="submit"
									variant="primary"
									disabled={ticketForm.formState.isSubmitting}
								>
									{ticketForm.formState.isSubmitting
										? 'Submitting...'
										: 'Submit Ticket'}
								</Button>
								<Button
									type="button"
									variant="secondary"
									onClick={() => {
										setShowCreateForm(false)
										setCreateError('')
										ticketForm.reset()
									}}
								>
									Cancel
								</Button>
							</div>
						</form>
					</div>
				)}

				{/* Ticket list */}
				{loading ? (
					<div className="flex items-center gap-3 text-kumo-secondary py-10">
						<CircleIcon
							size={18}
							weight="duotone"
							className="animate-spin text-kumo-inactive"
						/>
						Loading tickets...
					</div>
				) : tickets.length === 0 ? (
					<div className="bg-kumo-base border border-dashed border-kumo-line rounded-2xl py-16 text-center">
						<EnvelopeSimpleIcon
							size={40}
							weight="duotone"
							className="text-kumo-inactive mx-auto mb-3"
						/>
						<Text variant="secondary">
							{isAdmin
								? 'No tickets yet.'
								: 'No tickets yet. Create one to get help from our team.'}
						</Text>
					</div>
				) : (
					<div className="space-y-3">
						{tickets.map(ticket => (
							<button
								type="button"
								key={ticket.id}
								onClick={() => fetchTicketDetail(ticket.id)}
								className="w-full text-left bg-kumo-base border border-kumo-line rounded-2xl p-5 hover:border-kumo-default transition-colors"
							>
								<div className="flex items-start justify-between gap-3">
									<div className="flex-1 min-w-0">
										<p className="font-semibold text-kumo-default truncate">
											{ticket.title}
										</p>
										<div className="flex items-center gap-3 mt-1 text-xs text-kumo-secondary">
											<span className="capitalize">{ticket.topic}</span>
											<span>{timeAgo(ticket.createdAt)}</span>
											{isAdmin && ticket.userEmail && (
												<span className="truncate">{ticket.userEmail}</span>
											)}
										</div>
									</div>
									<span
										className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${
											ticket.status === 'open'
												? 'bg-kumo-success/15 text-kumo-success'
												: 'bg-kumo-control text-kumo-secondary'
										}`}
									>
										{ticket.status}
									</span>
								</div>
							</button>
						))}
					</div>
				)}
			</main>
		</div>
	)
}
