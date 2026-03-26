import {GestureHandlerRootView} from 'react-native-gesture-handler'
import {Stack} from 'expo-router'
import '../global.css'

export default function RootLayout() {
	return (
		<GestureHandlerRootView className="flex-1">
			<Stack screenOptions={{headerShown: false}}>
				<Stack.Screen name="(tabs)" />
				<Stack.Screen name="session/[id]" options={{presentation: 'card'}} />
			</Stack>
		</GestureHandlerRootView>
	)
}
