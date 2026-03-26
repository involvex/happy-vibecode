import {Ionicons} from '@expo/vector-icons'
import {Tabs} from 'expo-router'

type IconName = React.ComponentProps<typeof Ionicons>['name']

function TabIcon({name, focused}: {name: IconName; focused: boolean}) {
	return (
		<Ionicons name={name} size={24} color={focused ? '#7c3aed' : '#94a3b8'} />
	)
}

export default function TabLayout() {
	return (
		<Tabs
			screenOptions={{
				tabBarStyle: {
					backgroundColor: '#1a1a2e',
					borderTopColor: '#2a2a4a',
					height: 60,
					paddingBottom: 8,
				},
				tabBarActiveTintColor: '#7c3aed',
				tabBarInactiveTintColor: '#94a3b8',
				headerShown: false,
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: 'Chat',
					tabBarIcon: ({focused}) => (
						<TabIcon name="chatbubble-outline" focused={focused} />
					),
				}}
			/>
			<Tabs.Screen
				name="gallery"
				options={{
					title: 'Gallery',
					tabBarIcon: ({focused}) => (
						<TabIcon name="grid-outline" focused={focused} />
					),
				}}
			/>
			<Tabs.Screen
				name="history"
				options={{
					title: 'History',
					tabBarIcon: ({focused}) => (
						<TabIcon name="time-outline" focused={focused} />
					),
				}}
			/>
			<Tabs.Screen
				name="settings"
				options={{
					title: 'Settings',
					tabBarIcon: ({focused}) => (
						<TabIcon name="settings-outline" focused={focused} />
					),
				}}
			/>
		</Tabs>
	)
}
