import {Animated, View} from 'react-native'
import {useEffect, useRef} from 'react'

interface LoadingSkeletonProps {
	width?: number | string
	height?: number
	className?: string
}

export function LoadingSkeleton({
	width = '100%',
	height = 16,
	className,
}: LoadingSkeletonProps) {
	const opacity = useRef(new Animated.Value(0.3)).current

	useEffect(() => {
		const animation = Animated.loop(
			Animated.sequence([
				Animated.timing(opacity, {
					toValue: 1,
					duration: 800,
					useNativeDriver: true,
				}),
				Animated.timing(opacity, {
					toValue: 0.3,
					duration: 800,
					useNativeDriver: true,
				}),
			]),
		)
		animation.start()
		return () => animation.stop()
	}, [opacity])

	return (
		<Animated.View
			className={`bg-border dark:bg-border-dark rounded-lg ${className ?? ''}`}
			style={{
				width: width as number,
				height,
				opacity,
			}}
		/>
	)
}

export function SkeletonCard({className}: {className?: string}) {
	return (
		<View
			className={`bg-card dark:bg-card-dark rounded-2xl p-4 border border-border dark:border-border-dark gap-3 ${className ?? ''}`}
		>
			<View className="flex-row items-center justify-between">
				<LoadingSkeleton
					width="60%"
					height={14}
				/>
				<LoadingSkeleton
					width={60}
					height={20}
					className="rounded-full"
				/>
			</View>
			<LoadingSkeleton
				width="80%"
				height={12}
			/>
			<LoadingSkeleton
				width="40%"
				height={12}
			/>
		</View>
	)
}
