import {Text, TextInput, View, type TextInputProps} from 'react-native'
import {dp} from '../lib/scale'

interface InputProps extends TextInputProps {
	label?: string
	error?: string
}

export function Input({label, error, className, style, ...props}: InputProps) {
	return (
		<View>
			{label && (
				<Text className="text-muted dark:text-muted-dark text-xs mb-1">
					{label}
				</Text>
			)}
			<TextInput
				className={`bg-card dark:bg-card-dark border rounded-lg px-4 py-3 text-text dark:text-text-dark text-sm ${
					error
						? 'border-error'
						: 'border-border dark:border-border-dark'
				} ${className ?? ''}`}
				placeholderTextColor="#94a3b8"
				style={[{minHeight: dp(44)}, style]}
				{...props}
			/>
			{error && (
				<Text className="text-error text-xs mt-1">{error}</Text>
			)}
		</View>
	)
}
