import AsyncStorage from '@react-native-async-storage/async-storage'
import {GestureHandlerRootView} from 'react-native-gesture-handler'
import {useColorScheme} from 'nativewind'
import {Stack} from 'expo-router'
import {useEffect} from 'react'
import '../global.css'

const THEME_KEY = 'happy-color-scheme'

export default function RootLayout() {
	const {setColorScheme} = useColorScheme()

	useEffect(() => {
		AsyncStorage.getItem(THEME_KEY).then(saved => {
			if (saved === 'light') {
				setColorScheme('light')
			} else {
				// Default to dark
				setColorScheme('dark')
			}
		})
	}, [setColorScheme])

	return (
		<GestureHandlerRootView className="flex-1">
			<Stack screenOptions={{headerShown: false}}>
				<Stack.Screen name="(tabs)" />
				<Stack.Screen name="session/[id]" options={{presentation: 'card'}} />
			</Stack>
		</GestureHandlerRootView>
	)
}
