'use client'
import {
	CheckCircleIcon,
	XCircleIcon,
	InfoIcon,
	XIcon,
} from '@phosphor-icons/react'
import {useEffect, useState} from 'react'

export interface ToastMessage {
	id: string
	type: 'success' | 'error' | 'info'
	message: string
}

interface ToastProps {
	toast: ToastMessage
	onDismiss: (id: string) => void
}

function Toast({toast, onDismiss}: ToastProps) {
	const icons = {
		success: (
			<CheckCircleIcon
				size={18}
				className="text-kumo-success"
			/>
		),
		error: (
			<XCircleIcon
				size={18}
				className="text-kumo-danger"
			/>
		),
		info: (
			<InfoIcon
				size={18}
				className="text-kumo-accent"
			/>
		),
	}

	const borders = {
		success: 'border-kumo-success/20 bg-kumo-success/10',
		error: 'border-kumo-danger/20 bg-kumo-danger/10',
		info: 'border-kumo-accent/20 bg-kumo-accent/10',
	}

	useEffect(() => {
		const timer = setTimeout(() => onDismiss(toast.id), 5000)
		return () => clearTimeout(timer)
	}, [toast.id, onDismiss])

	return (
		<div
			className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${borders[toast.type]} animate-slide-in`}
		>
			{icons[toast.type]}
			<span className="text-sm text-kumo-default flex-1">{toast.message}</span>
			<button
				type="button"
				onClick={() => onDismiss(toast.id)}
				className="p-1 rounded text-kumo-secondary hover:text-kumo-default transition-colors"
			>
				<XIcon size={14} />
			</button>
		</div>
	)
}

interface ToastContainerProps {
	toasts: ToastMessage[]
	onDismiss: (id: string) => void
}

export function ToastContainer({toasts, onDismiss}: ToastContainerProps) {
	return (
		<div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
			{toasts.map(t => (
				<Toast
					key={t.id}
					toast={t}
					onDismiss={onDismiss}
				/>
			))}
		</div>
	)
}

export function useToasts() {
	const [toasts, setToasts] = useState<ToastMessage[]>([])

	const addToast = (type: ToastMessage['type'], message: string) => {
		const id = crypto.randomUUID()
		setToasts(prev => [...prev, {id, type, message}])
	}

	const dismissToast = (id: string) => {
		setToasts(prev => prev.filter(t => t.id !== id))
	}

	return {toasts, addToast, dismissToast}
}
