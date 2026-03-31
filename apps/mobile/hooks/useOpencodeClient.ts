import {useCallback, useEffect, useRef, useState} from 'react'

const HEALTH_CHECK_INTERVAL_MS = 10_000
const HEALTH_TIMEOUT_MS = 3_000

export type OpencodeConnectionMode = 'direct' | 'bridge' | 'none'

export interface OpencodeSession {
	id: string
	title?: string
}

export interface OpencodeClientState {
	/** How the mobile app reaches opencode */
	mode: OpencodeConnectionMode
	/** Whether the direct URL is reachable from this device */
	directReachable: boolean
	/** Active sessions on the opencode server (direct mode only) */
	sessions: OpencodeSession[]
	/** Trigger a one-off health recheck */
	recheck: () => void
}

/**
 * Lightweight opencode HTTP client for React Native.
 *
 * Uses fetch (not the Node.js SDK) so it works in React Native.
 *
 * When `opencodeUrl` points to a LAN address reachable from the mobile device
 * (e.g. the user's PC on the same Wi-Fi), this hook switches to "direct" mode
 * and can interact with the opencode REST API without going through the bridge.
 *
 * When the URL is unreachable (e.g. 127.0.0.1, or different network),
 * it reports "bridge" mode and all messages continue to flow through the
 * Cloudflare Worker bridge as normal.
 */
export function useOpencodeClient(
	opencodeUrl: string | null,
): OpencodeClientState {
	const [directReachable, setDirectReachable] = useState(false)
	const [sessions, setSessions] = useState<OpencodeSession[]>([])
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
	const recheckRef = useRef(0)

	const checkHealth = useCallback(async (url: string): Promise<boolean> => {
		try {
			const ctrl = new AbortController()
			const timer = setTimeout(() => ctrl.abort(), HEALTH_TIMEOUT_MS)
			const res = await fetch(`${url}/global/health`, {
				signal: ctrl.signal as unknown as RequestInit['signal'],
			})
			clearTimeout(timer)
			return res.ok
		} catch {
			return false
		}
	}, [])

	const fetchSessions = useCallback(
		async (url: string): Promise<OpencodeSession[]> => {
			try {
				const ctrl = new AbortController()
				const timer = setTimeout(() => ctrl.abort(), HEALTH_TIMEOUT_MS)
				const res = await fetch(`${url}/session`, {
					signal: ctrl.signal as unknown as RequestInit['signal'],
				})
				clearTimeout(timer)
				if (!res.ok) return []
				const data = (await res.json()) as
					| {sessions?: OpencodeSession[]}
					| OpencodeSession[]
				if (Array.isArray(data)) return data
				return data.sessions ?? []
			} catch {
				return []
			}
		},
		[],
	)

	const doCheck = useCallback(
		async (url: string) => {
			const ok = await checkHealth(url)
			setDirectReachable(ok)
			if (ok) {
				const list = await fetchSessions(url)
				setSessions(list)
			} else {
				setSessions([])
			}
		},
		[checkHealth, fetchSessions],
	)

	const recheck = useCallback(() => {
		recheckRef.current += 1
	}, [])

	useEffect(() => {
		if (!opencodeUrl) {
			setDirectReachable(false)
			setSessions([])
			return
		}

		// Immediate check on mount or URL change
		void doCheck(opencodeUrl)

		// Periodic recheck
		intervalRef.current = setInterval(
			() => void doCheck(opencodeUrl),
			HEALTH_CHECK_INTERVAL_MS,
		)

		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current)
		}
	}, [opencodeUrl, doCheck, recheckRef.current]) // eslint-disable-line react-hooks/exhaustive-deps

	const mode: OpencodeConnectionMode = !opencodeUrl
		? 'none'
		: directReachable
			? 'direct'
			: 'bridge'

	return {mode, directReachable, sessions, recheck}
}
