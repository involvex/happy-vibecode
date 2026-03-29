import * as LocalAuthentication from 'expo-local-authentication'
import {useCallback, useEffect, useState} from 'react'

export interface BiometricState {
	hasHardware: boolean
	isEnrolled: boolean
	supportedTypes: LocalAuthentication.AuthenticationType[]
	isAvailable: boolean
	authenticate: () => Promise<boolean>
}

export function useBiometric(): BiometricState {
	const [hasHardware, setHasHardware] = useState(false)
	const [isEnrolled, setIsEnrolled] = useState(false)
	const [supportedTypes, setSupportedTypes] = useState<
		LocalAuthentication.AuthenticationType[]
	>([])

	useEffect(() => {
		Promise.all([
			LocalAuthentication.hasHardwareAsync(),
			LocalAuthentication.isEnrolledAsync(),
			LocalAuthentication.supportedAuthenticationTypesAsync(),
		]).then(([hardware, enrolled, types]) => {
			setHasHardware(hardware)
			setIsEnrolled(enrolled)
			setSupportedTypes(types)
		})
	}, [])

	const authenticate = useCallback(async (): Promise<boolean> => {
		try {
			const result = await LocalAuthentication.authenticateAsync({
				promptMessage: 'Verify your identity',
				cancelLabel: 'Cancel',
				disableDeviceFallback: false,
			})
			return result.success
		} catch {
			return false
		}
	}, [])

	return {
		hasHardware,
		isEnrolled,
		supportedTypes,
		isAvailable: hasHardware && isEnrolled,
		authenticate,
	}
}
