import AsyncStorage from '@react-native-async-storage/async-storage'
import {useCallback, useEffect, useRef, useState} from 'react'
import {useNetworkStatus} from './useNetworkStatus'

const QUEUE_KEY = 'happy-offline-queue'

interface QueueItem {
	id: string
	action: string
	payload: Record<string, unknown>
	timestamp: number
}

export interface OfflineQueueState {
	pendingCount: number
	isSyncing: boolean
	lastSyncError: string | null
	enqueue: (action: string, payload: Record<string, unknown>) => Promise<void>
	flush: (apiToken: string, serverUrl: string) => Promise<void>
}

export function useOfflineSync(
	apiToken: string | null,
	serverUrl: string | null,
): OfflineQueueState {
	const {isConnected} = useNetworkStatus()
	const [queue, setQueue] = useState<QueueItem[]>([])
	const [isSyncing, setIsSyncing] = useState(false)
	const [lastSyncError, setLastSyncError] = useState<string | null>(null)
	const syncingRef = useRef(false)

	const loadQueue = useCallback(async () => {
		try {
			const raw = await AsyncStorage.getItem(QUEUE_KEY)
			if (raw) {
				setQueue(JSON.parse(raw) as QueueItem[])
			}
		} catch {}
	}, [])

	const saveQueue = useCallback(async (items: QueueItem[]) => {
		setQueue(items)
		await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items))
	}, [])

	useEffect(() => {
		loadQueue()
	}, [loadQueue])

	// Auto-flush when connected and queue has items
	useEffect(() => {
		if (
			isConnected &&
			queue.length > 0 &&
			apiToken &&
			serverUrl &&
			!syncingRef.current
		) {
			const doSync = async () => {
				syncingRef.current = true
				setIsSyncing(true)
				setLastSyncError(null)
				try {
					const response = await fetch(`${serverUrl}/api/sync/process`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${apiToken}`,
						},
						body: JSON.stringify({
							items: queue.map(item => ({
								action: item.action,
								payload: item.payload,
							})),
						}),
					})
					if (!response.ok) throw new Error(`Sync failed: ${response.status}`)
					const result = (await response.json()) as {
						processed: number
						results: {id: string; status: string}[]
					}
					const failedIds = new Set(
						result.results
							.filter(r => r.status === 'failed')
							.map((_, i) => queue[i]?.id),
					)
					const remaining = queue.filter(item => failedIds.has(item.id))
					await saveQueue(remaining)
				} catch (err) {
					setLastSyncError(err instanceof Error ? err.message : 'Sync failed')
				} finally {
					syncingRef.current = false
					setIsSyncing(false)
				}
			}
			doSync()
		}
	}, [isConnected, queue, apiToken, serverUrl, saveQueue])

	const enqueue = useCallback(
		async (action: string, payload: Record<string, unknown>) => {
			const item: QueueItem = {
				id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
				action,
				payload,
				timestamp: Date.now(),
			}
			const next = [...queue, item]
			await saveQueue(next)
		},
		[queue, saveQueue],
	)

	const flushQueue = useCallback(
		async (token: string, url: string) => {
			if (syncingRef.current || queue.length === 0) return
			syncingRef.current = true
			setIsSyncing(true)
			setLastSyncError(null)

			try {
				const response = await fetch(`${url}/api/sync/process`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						items: queue.map(item => ({
							action: item.action,
							payload: item.payload,
						})),
					}),
				})

				if (!response.ok) {
					throw new Error(`Sync failed: ${response.status}`)
				}

				const result = (await response.json()) as {
					processed: number
					results: {id: string; status: string; error?: string}[]
				}

				// Remove completed items, keep failed ones
				const failedIds = new Set(
					result.results
						.filter(r => r.status === 'failed')
						.map((_, i) => queue[i]?.id),
				)
				const remaining = queue.filter(item => failedIds.has(item.id))
				await saveQueue(remaining)
			} catch (err) {
				setLastSyncError(err instanceof Error ? err.message : 'Sync failed')
			} finally {
				syncingRef.current = false
				setIsSyncing(false)
			}
		},
		[queue, saveQueue],
	)

	const flush = useCallback(
		async (token: string, url: string) => {
			await flushQueue(token, url)
		},
		[flushQueue],
	)

	return {
		pendingCount: queue.length,
		isSyncing,
		lastSyncError,
		enqueue,
		flush,
	}
}
