import {setupNotificationChannels} from '../lib/notification-channels'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {GestureHandlerRootView} from 'react-native-gesture-handler'
import {usePushNotifications} from '../hooks/usePushNotifications'
import {BiometricGate} from '../components/BiometricGate'
import {useAppLock} from '../hooks/useAppLock'
import {useColorScheme} from 'nativewind'
import {Stack} from 'expo-router'
import {useEffect} from 'react'
import '../global.css'

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
