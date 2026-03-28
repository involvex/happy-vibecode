import {useCallback, useEffect, useRef, useState} from 'react'
import {Animated, Text, View} from 'react-native'
import {Ionicons} from '@expo/vector-icons'
import {dp} from '../lib/scale'

type ToastVariant = 'success' | 'error' | 'info'

interface ToastMessage {
	id: number
	message: string
	variant: ToastVariant
}

const variantStyles = {
	success: {
		border: 'border-success',
		bg: 'bg-success/10',
		icon: 'checkmark-circle' as const,
		iconColor: '#22c55e',
	},
	error: {
		border: 'border-error',
		bg: 'bg-error/10',
		icon: 'close-circle' as const,
		iconColor: '#ef4444',
	},
	info: {
		border: 'border-primary',
		bg: 'bg-primary/10',
		icon: 'information-circle' as const,
		iconColor: '#7c3aed',
	},
}

function ToastItem({
	message,
	variant,
	onDone,
}: {
	message: string
	variant: ToastVariant
	onDone: () => void
}) {
	const translateY = useRef(new Animated.Value(-100)).current
	const opacity = useRef(new Animated.Value(0)).current
	const styles = variantStyles[variant]

	useEffect(() => {
		Animated.parallel([
			Animated.timing(translateY, {
				toValue: 0,
				duration: 300,
				useNativeDriver: true,
			}),
			Animated.timing(opacity, {
				toValue: 1,
				duration: 300,
				useNativeDriver: true,
			}),
		]).start()

		const timer = setTimeout(() => {
			Animated.parallel([
				Animated.timing(translateY, {
					toValue: -100,
					duration: 300,
					useNativeDriver: true,
				}),
				Animated.timing(opacity, {
					toValue: 0,
					duration: 300,
					useNativeDriver: true,
				}),
			]).start(() => onDone())
		}, 3000)

		return () => clearTimeout(timer)
	}, [translateY, opacity, onDone])

	return (
		<Animated.View
			className={`absolute top-0 left-4 right-4 border-l-4 rounded-xl px-4 py-3 flex-row items-center gap-3 ${styles.border} ${styles.bg}`}
			style={{
				transform: [{translateY}],
				opacity,
				shadowColor: '#000',
				shadowOffset: {width: 0, height: 2},
				shadowOpacity: 0.25,
				shadowRadius: 4,
				elevation: 5,
				marginTop: dp(50),
			}}
		>
			<Ionicons name={styles.icon} size={dp(20)} color={styles.iconColor} />
			<Text className="text-text dark:text-text-dark text-sm flex-1 font-medium">
				{message}
			</Text>
		</Animated.View>
	)
}

let toastId = 0

interface ToastContextValue {
	show: (message: string, variant?: ToastVariant) => void
}

let toastHandler: ToastContextValue | null = null

export function ToastProvider({children}: {children: React.ReactNode}) {
	const [toasts, setToasts] = useState<ToastMessage[]>([])

	const show = useCallback(
		(message: string, variant: ToastVariant = 'info') => {
			const id = ++toastId
			setToasts(prev => [...prev, {id, message, variant}])
		},
		[],
	)

	const remove = useCallback((id: number) => {
		setToasts(prev => prev.filter(t => t.id !== id))
	}, [])

	useEffect(() => {
		toastHandler = {show}
		return () => {
			toastHandler = null
		}
	}, [show])

	return (
		<View className="flex-1">
			{children}
			{toasts.map(toast => (
				<ToastItem
					key={toast.id}
					message={toast.message}
					variant={toast.variant}
					onDone={() => remove(toast.id)}
				/>
			))}
		</View>
	)
}

export function useToast(): ToastContextValue {
	return {
		show: (message: string, variant: ToastVariant = 'info') => {
			toastHandler?.show(message, variant)
		},
	}
}
