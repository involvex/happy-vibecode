import {useCallback, useEffect, useRef, useState} from 'react'
import * as Notifications from 'expo-notifications'
import * as SecureStore from 'expo-secure-store'
import {Platform} from 'react-native'
import * as Device from 'expo-device'

Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowAlert: true,
		shouldPlaySound: true,
		shouldSetBadge: false,
		shouldShowBanner: true,
		shouldShowList: true,
	}),
})

const PUSH_TOKEN_KEY = 'happy-push-token'

export function usePushNotifications() {
	const [expoPushToken, setExpoPushToken] = useState<string | null>(null)
	const [permissionStatus, setPermissionStatus] =
		useState<string>('undetermined')
	const notificationListener = useRef<Notifications.Subscription | null>(null)
	const responseListener = useRef<Notifications.Subscription | null>(null)

	const registerToken = useCallback(
		async (
			token: string,
			apiToken: string | null,
			serverUrl: string | null,
		) => {
			if (!apiToken) return

			const stored = await SecureStore.getItemAsync(PUSH_TOKEN_KEY)
			if (stored === token) return

			const baseUrl = serverUrl ?? 'https://happy-vibecode.involvex.workers.dev'
			try {
				await fetch(`${baseUrl}/api/devices`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${apiToken}`,
					},
					body: JSON.stringify({
						token,
						platform: Platform.OS === 'ios' ? 'ios' : 'android',
					}),
				})
				await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token)
			} catch {
				// Registration will retry on next app launch
			}
		},
		[],
	)

	const requestPermissions = useCallback(async () => {
		if (!Device.isDevice) {
			setPermissionStatus('unavailable')
			return null
		}

		const {status: existingStatus} = await Notifications.getPermissionsAsync()
		let finalStatus = existingStatus

		if (existingStatus !== 'granted') {
			const {status} = await Notifications.requestPermissionsAsync()
			finalStatus = status
		}

		setPermissionStatus(finalStatus)
		if (finalStatus !== 'granted') return null

		try {
			const token = (await Notifications.getExpoPushTokenAsync()).data
			setExpoPushToken(token)
			return token
		} catch (error) {
			console.warn('[Push] Failed to get push token:', error)
			return null
		}
	}, [])

	useEffect(() => {
		notificationListener.current =
			Notifications.addNotificationReceivedListener(notification => {
				// Handle foreground notifications
				console.log('[Push] Received:', notification.request.content.title)
			})

		responseListener.current =
			Notifications.addNotificationResponseReceivedListener(response => {
				const data = response.notification.request.content.data
				if (data?.sessionId) {
					// Navigation would be handled by the root layout
					console.log('[Push] Tapped, session:', data.sessionId)
				}
			})

		return () => {
			notificationListener.current?.remove()
			responseListener.current?.remove()
		}
	}, [])

	return {
		expoPushToken,
		permissionStatus,
		requestPermissions,
		registerToken,
	}
}
