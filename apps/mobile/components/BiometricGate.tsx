import {View, Text, ActivityIndicator} from 'react-native'
import {useCallback, useEffect, useState} from 'react'
import {useBiometric} from '../hooks/useBiometric'

interface BiometricGateProps {
	isLocked: boolean
	isLoading: boolean
	unlock: () => Promise<boolean>
	children: React.ReactNode
}

export function BiometricGate({
	isLocked,
	isLoading,
	unlock,
	children,
}: BiometricGateProps) {
	const {isAvailable} = useBiometric()
	const [unlocking, setUnlocking] = useState(false)
	const [failed, setFailed] = useState(false)

	const handleUnlock = useCallback(async () => {
		if (unlocking) return
		setUnlocking(true)
		setFailed(false)
		const success = await unlock()
		if (!success) {
			setFailed(true)
		}
		setUnlocking(false)
	}, [unlocking, unlock])

	useEffect(() => {
		if (isLocked && isAvailable && !unlocking) {
			handleUnlock()
		}
	}, [isLocked, isAvailable, unlocking, handleUnlock])

	if (isLoading) {
		return (
			<View className="flex-1 items-center justify-center bg-surface dark:bg-surface-dark">
				<ActivityIndicator
					size="large"
					color="#7c3aed"
				/>
			</View>
		)
	}

	if (isLocked && isAvailable) {
		return (
			<View className="flex-1 items-center justify-center bg-surface dark:bg-surface-dark px-8">
				<Text className="text-5xl mb-4">🔐</Text>
				<Text className="text-text dark:text-text-dark text-lg font-semibold mb-2">
					App Locked
				</Text>
				<Text className="text-muted dark:text-muted-dark text-sm text-center mb-6">
					Authenticate to continue using Happy Vibecode
				</Text>
				{failed && (
					<Text className="text-error text-sm mb-4">
						Authentication failed. Try again.
					</Text>
				)}
				<View
					className="bg-primary rounded-2xl px-8 py-3"
					style={{opacity: unlocking ? 0.6 : 1}}
				>
					{unlocking ? (
						<ActivityIndicator
							size="small"
							color="white"
						/>
					) : (
						<Text
							className="text-white font-semibold text-base"
							onPress={handleUnlock}
						>
							Unlock
						</Text>
					)}
				</View>
			</View>
		)
	}

	return <>{children}</>
}
