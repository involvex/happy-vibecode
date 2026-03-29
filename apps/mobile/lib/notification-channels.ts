import * as Notifications from 'expo-notifications'
import {Platform} from 'react-native'

export async function setupNotificationChannels() {
	if (Platform.OS !== 'android') return

	await Notifications.setNotificationChannelAsync('default', {
		name: 'Default',
		importance: Notifications.AndroidImportance.MAX,
		vibrationPattern: [0, 250, 250, 250],
		lightColor: '#7c3aed',
		enableVibrate: true,
		showBadge: true,
	})

	await Notifications.setNotificationChannelAsync('agent-updates', {
		name: 'Agent Updates',
		description: 'Notifications about agent task completions and errors',
		importance: Notifications.AndroidImportance.HIGH,
		vibrationPattern: [0, 250, 250, 250],
		lightColor: '#7c3aed',
		enableVibrate: true,
		showBadge: true,
	})

	await Notifications.setNotificationChannelAsync('agent-input', {
		name: 'Input Required',
		description: 'Notifications when an agent requires your input',
		importance: Notifications.AndroidImportance.MAX,
		vibrationPattern: [0, 500, 250, 500],
		lightColor: '#f59e0b',
		enableVibrate: true,
		showBadge: true,
	})
}
