import AsyncStorage from '@react-native-async-storage/async-storage'
import {Stack} from 'expo-router'
import {useColorScheme} from 'nativewind'
import {useEffect} from 'react'
import {GestureHandlerRootView} from 'react-native-gesture-handler'
import {BiometricGate} from '../components/BiometricGate'
import '../global.css'
import {useAppLock} from '../hooks/useAppLock'
import {usePushNotifications} from '../hooks/usePushNotifications'
import {setupNotificationChannels} from '../lib/notification-channels'

const THEME_KEY = 'happy-color-scheme'

export default function RootLayout() {
	const {setColorScheme} = useColorScheme()
	const {isLocked, isLoading, unlock} = useAppLock()
	const {requestPermissions} = usePushNotifications()

	useEffect(() => {
		AsyncStorage.getItem(THEME_KEY).then(saved => {
			if (saved === 'light' || saved === 'dark') {
				setColorScheme(saved)
			}
		})
	}, [setColorScheme])

	useEffect(() => {
		setupNotificationChannels()
		requestPermissions()
	}, [requestPermissions])

	return (
		<GestureHandlerRootView className="flex-1">
			<BiometricGate
				isLocked={isLocked}
				isLoading={isLoading}
				unlock={unlock}
			>
				<Stack screenOptions={{headerShown: false}}>
					<Stack.Screen name="(tabs)" />
					<Stack.Screen
						name="session/[id]"
						options={{presentation: 'card'}}
					/>
					<Stack.Screen name="templates/index" />
					<Stack.Screen
						name="templates/[id]"
						options={{presentation: 'card'}}
					/>
					<Stack.Screen
						name="templates/create"
						options={{presentation: 'card'}}
					/>
				</Stack>
			</BiometricGate>
		</GestureHandlerRootView>
	)
}
