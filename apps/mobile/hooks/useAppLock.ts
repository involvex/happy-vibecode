import {useCallback, useEffect, useRef, useState} from 'react'
import {AppState, type AppStateStatus} from 'react-native'
import * as SecureStore from 'expo-secure-store'
import {useBiometric} from './useBiometric'

const BIOMETRIC_ENABLED_KEY = 'happy-biometric-enabled'

export interface AppLockState {
	isLocked: boolean
	biometricEnabled: boolean
	isLoading: boolean
	unlock: () => Promise<boolean>
	setBiometricEnabled: (enabled: boolean) => Promise<void>
}

export function useAppLock(): AppLockState {
	const {isAvailable, authenticate} = useBiometric()
	const [biometricEnabled, setBiometricEnabledState] = useState(false)
	const [isLocked, setIsLocked] = useState(false)
	const [isLoading, setIsLoading] = useState(true)
	const appState = useRef(AppState.currentState)

	// Load preference on mount
	useEffect(() => {
		SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY).then(value => {
			const enabled = value === 'true'
			setBiometricEnabledState(enabled)
			if (enabled && isAvailable) {
				setIsLocked(true)
			}
			setIsLoading(false)
		})
	}, [isAvailable])

	// Listen for app state changes — lock on background→active transition
	useEffect(() => {
		if (!biometricEnabled || !isAvailable) return

		const subscription = AppState.addEventListener(
			'change',
			(nextState: AppStateStatus) => {
				if (
					appState.current.match(/inactive|background/) &&
					nextState === 'active'
				) {
					setIsLocked(true)
				}
				appState.current = nextState
			},
		)

		return () => subscription.remove()
	}, [biometricEnabled, isAvailable])

	const unlock = useCallback(async (): Promise<boolean> => {
		const success = await authenticate()
		if (success) {
			setIsLocked(false)
		}
		return success
	}, [authenticate])

	const setBiometricEnabled = useCallback(
		async (enabled: boolean) => {
			if (enabled && !isAvailable) return

			await SecureStore.setItemAsync(
				BIOMETRIC_ENABLED_KEY,
				enabled ? 'true' : 'false',
			)
			setBiometricEnabledState(enabled)

			if (!enabled) {
				setIsLocked(false)
			}
		},
		[isAvailable],
	)

	return {
		isLocked,
		biometricEnabled,
		isLoading,
		unlock,
		setBiometricEnabled,
	}
}
