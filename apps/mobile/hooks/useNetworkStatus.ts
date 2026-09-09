import * as Network from 'expo-network'
import {useCallback, useEffect, useState} from 'react'

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
		let cancelled = false
		let interval: ReturnType<typeof setInterval> | null = null
		const run = async () => {
			try {
				await checkConnection()
			} finally {
				if (!cancelled) setIsLoading(false)
			}
			interval = setInterval(checkConnection, 10000)
		}
		run()
		return () => {
			cancelled = true
			if (interval) clearInterval(interval)
		}
	}, [checkConnection])

	return {isConnected, isLoading, checkConnection}
}
