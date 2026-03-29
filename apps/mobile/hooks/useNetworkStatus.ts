import {useCallback, useEffect, useState} from 'react'
import * as Network from 'expo-network'

export interface NetworkStatus {
	isConnected: boolean
	isLoading: boolean
	checkConnection: () => Promise<boolean>
}

export function useNetworkStatus(): NetworkStatus {
	const [isConnected, setIsConnected] = useState(true)
	const [isLoading, setIsLoading] = useState(true)

	const checkConnection = useCallback(async (): Promise<boolean> => {
		try {
			const state = await Network.getNetworkStateAsync()
			const connected =
				(state.isConnected ?? false) && state.isInternetReachable !== false
			setIsConnected(connected)
			return connected
		} catch {
			setIsConnected(true)
			return true
		}
	}, [])

	useEffect(() => {
		checkConnection().finally(() => setIsLoading(false))

		const interval = setInterval(checkConnection, 10000)
		return () => clearInterval(interval)
	}, [checkConnection])

	return {isConnected, isLoading, checkConnection}
}
