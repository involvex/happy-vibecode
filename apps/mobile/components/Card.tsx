import {View, type ViewProps} from 'react-native'

interface CardProps extends ViewProps {
	children: React.ReactNode
	className?: string
}

export function Card({children, className, ...props}: CardProps) {
	return (
		<View
			className={`bg-card dark:bg-card-dark rounded-2xl p-4 border border-border dark:border-border-dark ${className ?? ''}`}
			{...props}
		>
			{children}
		</View>
	)
}
