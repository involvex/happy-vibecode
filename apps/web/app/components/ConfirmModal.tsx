'use client'
import {Button} from '@cloudflare/kumo'

interface ConfirmModalProps {
	open: boolean
	title: string
	message: string
	confirmLabel?: string
	variant?: 'danger' | 'primary'
	loading?: boolean
	onConfirm: () => void
	onCancel: () => void
}

export function ConfirmModal({
	open,
	title,
	message,
	confirmLabel = 'Confirm',
	variant = 'danger',
	loading,
	onConfirm,
	onCancel,
}: ConfirmModalProps) {
	if (!open) return null

	return (
		<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
			<div className="bg-kumo-base border border-kumo-line rounded-2xl w-full max-w-md p-6 space-y-4">
				<h3 className="text-lg font-semibold text-kumo-default">{title}</h3>
				<p className="text-sm text-kumo-secondary">{message}</p>
				<div className="flex gap-3 justify-end pt-2">
					<Button
						variant="secondary"
						size="sm"
						onClick={onCancel}
						disabled={loading}
					>
						Cancel
					</Button>
					<Button
						variant={variant === 'danger' ? 'destructive' : 'primary'}
						size="sm"
						onClick={onConfirm}
						disabled={loading}
					>
						{loading ? 'Processing...' : confirmLabel}
					</Button>
				</div>
			</div>
		</div>
	)
}
