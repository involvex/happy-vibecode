import {Ionicons} from '@expo/vector-icons'
import {Text, View} from 'react-native'
import {dp} from '../lib/scale'

interface EmptyStateProps {
	icon: keyof typeof Ionicons.glyphMap
	title?: string
	message: string
}

export function EmptyState({icon, title, message}: EmptyStateProps) {
	return (
		<View className="flex-1 items-center justify-center px-6 gap-3">
			<Ionicons name={icon} size={dp(48)} color="#94a3b8" />
			{title && (
				<Text className="text-text dark:text-text-dark text-lg font-semibold text-center">
					{title}
				</Text>
			)}
			<Text className="text-muted dark:text-muted-dark text-sm text-center">
				{message}
			</Text>
		</View>
	)
}
