import {
	ActivityIndicator,
	Text,
	TouchableOpacity,
	View,
	type TouchableOpacityProps,
} from 'react-native'
import {Ionicons} from '@expo/vector-icons'
import {dp} from '../lib/scale'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends Omit<TouchableOpacityProps, 'children'> {
	title: string
	variant?: ButtonVariant
	loading?: boolean
	disabled?: boolean
	icon?: keyof typeof Ionicons.glyphMap
}

const variantStyles = {
	primary: {
		container: 'bg-primary',
		text: 'text-white',
		disabled: 'bg-primary/50',
	},
	secondary: {
		container: 'bg-card dark:bg-card-dark border border-border dark:border-border-dark',
		text: 'text-text dark:text-text-dark',
		disabled: 'bg-card dark:bg-card-dark opacity-50',
	},
	ghost: {
		container: 'bg-transparent',
		text: 'text-primary',
		disabled: 'opacity-50',
	},
}

export function Button({
	title,
	variant = 'primary',
	loading = false,
	disabled = false,
	icon,
	className,
	...props
}: ButtonProps) {
	const styles = variantStyles[variant]
	const isDisabled = disabled || loading

	return (
		<TouchableOpacity
			className={`rounded-xl items-center justify-center flex-row gap-2 ${styles.container} ${isDisabled ? styles.disabled : ''} ${className ?? ''}`}
			style={{paddingVertical: dp(12), paddingHorizontal: dp(16)}}
			disabled={isDisabled}
			activeOpacity={0.7}
			{...props}
		>
			{loading ? (
				<ActivityIndicator
					color={variant === 'primary' ? '#ffffff' : '#7c3aed'}
					size="small"
				/>
			) : (
				<View className="flex-row items-center gap-2">
					{icon && (
						<Ionicons
							name={icon}
							size={dp(18)}
							color={variant === 'primary' ? '#ffffff' : '#7c3aed'}
						/>
					)}
					<Text className={`${styles.text} font-semibold text-sm`}>
						{title}
					</Text>
				</View>
			)}
		</TouchableOpacity>
	)
}
