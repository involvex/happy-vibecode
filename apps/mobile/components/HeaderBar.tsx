import {Text, TouchableOpacity, View} from 'react-native'
import {Ionicons} from '@expo/vector-icons'
import {useColorScheme} from 'nativewind'
import {dp} from '../lib/scale'

interface HeaderBarProps {
	title: string
	showBack?: boolean
	onBack?: () => void
	right?: React.ReactNode
}

export function HeaderBar({title, showBack, onBack, right}: HeaderBarProps) {
	const {colorScheme} = useColorScheme()
	const isDark = colorScheme === 'dark'
	const iconColor = isDark ? '#e2e8f0' : '#1e293b'

	return (
		<View className="px-4 py-3 border-b border-border dark:border-border-dark bg-surface dark:bg-surface-dark flex-row items-center">
			{showBack && (
				<TouchableOpacity
					onPress={onBack}
					className="mr-3 p-1 -ml-1"
					hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
				>
					<Ionicons name="arrow-back" size={dp(22)} color={iconColor} />
				</TouchableOpacity>
			)}
			<Text
				className="text-text dark:text-text-dark text-lg font-semibold flex-1"
				numberOfLines={1}
			>
				{title}
			</Text>
			{right && <View>{right}</View>}
		</View>
	)
}
