import {Ionicons} from '@expo/vector-icons'
import {Text, View} from 'react-native'

interface OfflineBannerProps {
	isConnected: boolean
	pendingCount: number
	isSyncing: boolean
}

export function OfflineBanner({
	isConnected,
	pendingCount,
	isSyncing,
}: OfflineBannerProps) {
	if (isConnected && pendingCount === 0) return null

	return (
		<View
			className={`flex-row items-center justify-center gap-2 px-4 py-2 ${
				isConnected ? 'bg-primary/10' : 'bg-warning/10'
			}`}
		>
			{!isConnected ? (
				<>
					<Ionicons
						name="cloud-offline-outline"
						size={14}
						color="#f59e0b"
					/>
					<Text className="text-xs font-medium text-warning">
						You&apos;re offline
						{pendingCount > 0
							? ` — ${pendingCount} action${pendingCount > 1 ? 's' : ''} queued`
							: ''}
					</Text>
				</>
			) : isSyncing ? (
				<>
					<Ionicons
						name="sync-outline"
						size={14}
						color="#7c3aed"
					/>
					<Text className="text-xs font-medium text-primary">
						Syncing {pendingCount} action{pendingCount > 1 ? 's' : ''}...
					</Text>
				</>
			) : null}
		</View>
	)
}
