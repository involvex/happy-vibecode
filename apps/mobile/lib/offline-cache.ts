import AsyncStorage from '@react-native-async-storage/async-storage'
import {useCallback, useEffect, useState} from 'react'

const CACHE_PREFIX = 'happy-cache:'
const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

interface CacheEntry<T> {
	data: T
	timestamp: number
	ttl: number
}

export async function cacheGet<T>(key: string): Promise<T | null> {
	try {
		const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`)
		if (!raw) return null
		const entry = JSON.parse(raw) as CacheEntry<T>
		if (Date.now() - entry.timestamp > entry.ttl) {
			await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`)
			return null
		}
		return entry.data
	} catch {
		return null
	}
}

export async function cacheSet<T>(
	key: string,
	data: T,
	ttl: number = DEFAULT_TTL,
): Promise<void> {
	const entry: CacheEntry<T> = {data, timestamp: Date.now(), ttl}
	await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry))
}

export async function cacheInvalidate(key: string): Promise<void> {
	await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`)
}

export function useCachedData<T>(
	key: string,
	fetcher: () => Promise<T>,
	isConnected: boolean,
	ttl: number = DEFAULT_TTL,
) {
	const [data, setData] = useState<T | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [isStale, setIsStale] = useState(false)

	const load = useCallback(async () => {
		setIsLoading(true)

		if (isConnected) {
			try {
				const fresh = await fetcher()
				setData(fresh)
				setIsStale(false)
				await cacheSet(key, fresh, ttl)
			} catch {
				const cached = await cacheGet<T>(key)
				if (cached) {
					setData(cached)
					setIsStale(true)
				}
			}
		} else {
			const cached = await cacheGet<T>(key)
			if (cached) {
				setData(cached)
				setIsStale(true)
			}
		}

		setIsLoading(false)
	}, [key, fetcher, isConnected, ttl])

	useEffect(() => {
		load()
	}, [load])

	return {data, isLoading, isStale, refresh: load}
}
