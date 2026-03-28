import {Text, View} from 'react-native'

type BadgeVariant = 'active' | 'inactive' | 'error' | 'warning'

interface BadgeProps {
	label: string
	variant?: BadgeVariant
}

const variantStyles = {
	active: {
		container: 'bg-success/20',
		text: 'text-success',
	},
	inactive: {
		container: 'bg-muted/20 dark:bg-muted/10',
		text: 'text-muted dark:text-muted-dark',
	},
	error: {
		container: 'bg-error/20',
		text: 'text-error',
	},
	warning: {
		container: 'bg-warning/20',
		text: 'text-warning',
	},
}

export function Badge({label, variant = 'inactive'}: BadgeProps) {
	const styles = variantStyles[variant]

	return (
		<View className={`rounded-full px-2 py-0.5 ${styles.container}`}>
			<Text className={`text-xs font-medium ${styles.text}`}>{label}</Text>
		</View>
	)
}
