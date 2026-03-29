import type {PushPayload} from '@happy-vibecode/shared'

interface FcmMessage {
	message: {
		token: string
		notification: {
			title: string
			body: string
		}
		data?: Record<string, string>
		android?: {
			priority: 'high' | 'normal'
		}
		apns?: {
			payload: {
				aps: {
					alert: {title: string; body: string}
					sound: string
					badge?: number
				}
			}
		}
	}
}

interface ServiceAccountKey {
	project_id: string
	private_key: string
	private_key_id: string
	client_email: string
}

let cachedFcmToken: {token: string; expiresAt: number} | null = null

async function getFcmAccessToken(
	serviceAccount: ServiceAccountKey,
): Promise<string> {
	if (cachedFcmToken && Date.now() < cachedFcmToken.expiresAt) {
		return cachedFcmToken.token
	}

	const now = Math.floor(Date.now() / 1000)
	const header = {
		alg: 'RS256',
		typ: 'JWT',
		kid: serviceAccount.private_key_id,
	}
	const payload = {
		iss: serviceAccount.client_email,
		sub: serviceAccount.client_email,
		aud: 'https://oauth2.googleapis.com/token',
		iat: now,
		exp: now + 3600,
		scope: 'https://www.googleapis.com/auth/firebase.messaging',
	}

	const encoder = new TextEncoder()
	const headerB64 = btoa(JSON.stringify(header))
		.replace(/=/g, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
	const payloadB64 = btoa(JSON.stringify(payload))
		.replace(/=/g, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
	const unsignedToken = `${headerB64}.${payloadB64}`

	const pemContents = serviceAccount.private_key
		.replace('-----BEGIN PRIVATE KEY-----', '')
		.replace('-----END PRIVATE KEY-----', '')
		.replace(/\s/g, '')

	const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))

	const key = await crypto.subtle.importKey(
		'pkcs8',
		binaryDer,
		{name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256'},
		false,
		['sign'],
	)

	const signature = await crypto.subtle.sign(
		'RSASSA-PKCS1-v1_5',
		key,
		encoder.encode(unsignedToken),
	)

	const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
		.replace(/=/g, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')

	const jwt = `${unsignedToken}.${signatureB64}`

	const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: {'Content-Type': 'application/x-www-form-urlencoded'},
		body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
	})

	if (!tokenResponse.ok) {
		const errorText = await tokenResponse.text()
		throw new Error(
			`FCM token exchange failed: ${tokenResponse.status} ${errorText}`,
		)
	}

	const tokenData = (await tokenResponse.json()) as {
		access_token: string
		expires_in: number
	}
	cachedFcmToken = {
		token: tokenData.access_token,
		expiresAt: Date.now() + (tokenData.expires_in - 60) * 1000,
	}

	return tokenData.access_token
}

export async function sendFcmNotification(
	token: string,
	payload: PushPayload,
	serviceAccountJson: string,
): Promise<boolean> {
	const serviceAccount = JSON.parse(serviceAccountJson) as ServiceAccountKey
	const accessToken = await getFcmAccessToken(serviceAccount)

	const message: FcmMessage = {
		message: {
			token,
			notification: {
				title: payload.title,
				body: payload.body,
			},
			data: payload.data,
			android: {
				priority: 'high',
			},
			apns: {
				payload: {
					aps: {
						alert: {title: payload.title, body: payload.body},
						sound: payload.sound ?? 'default',
						...(payload.badge !== undefined ? {badge: payload.badge} : {}),
					},
				},
			},
		},
	}

	const response = await fetch(
		`https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(message),
		},
	)

	if (!response.ok) {
		const errorText = await response.text()
		console.error(
			`[FCM] Send failed for token ${token.slice(0, 8)}...: ${response.status} ${errorText}`,
		)
		return false
	}

	return true
}

export async function sendApnsNotification(
	token: string,
	payload: PushPayload,
	apnsAuthKey: string,
	keyId: string,
	teamId: string,
): Promise<boolean> {
	const now = Math.floor(Date.now() / 1000)
	const jwtHeader = {
		alg: 'ES256',
		kid: keyId,
	}
	const jwtPayload = {
		iss: teamId,
		iat: now,
	}

	const headerB64 = btoa(JSON.stringify(jwtHeader))
		.replace(/=/g, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
	const payloadB64 = btoa(JSON.stringify(jwtPayload))
		.replace(/=/g, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
	const unsignedToken = `${headerB64}.${payloadB64}`

	const encoder = new TextEncoder()
	const pemContents = apnsAuthKey
		.replace('-----BEGIN PRIVATE KEY-----', '')
		.replace('-----END PRIVATE KEY-----', '')
		.replace(/\s/g, '')

	const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))

	const key = await crypto.subtle.importKey(
		'pkcs8',
		binaryDer,
		{name: 'ECDSA', namedCurve: 'P-256'},
		false,
		['sign'],
	)

	const signature = await crypto.subtle.sign(
		{name: 'ECDSA', hash: 'SHA-256'},
		key,
		encoder.encode(unsignedToken),
	)

	const r = Array.from(new Uint8Array(signature.slice(0, 32)))
	const s = Array.from(new Uint8Array(signature.slice(32, 64)))
	const derLen = 4 + r.length + 4 + s.length
	const derSignature = new Uint8Array(derLen)
	let offset = 0
	derSignature[offset++] = 0x30
	derSignature[offset++] = derLen - 2
	derSignature[offset++] = 0x02
	derSignature[offset++] = r.length
	derSignature.set(r, offset)
	offset += r.length
	derSignature[offset++] = 0x02
	derSignature[offset++] = s.length
	derSignature.set(s, offset)

	const signatureB64 = btoa(String.fromCharCode(...derSignature))
		.replace(/=/g, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')

	const jwt = `${unsignedToken}.${signatureB64}`

	const apnsPayload = {
		aps: {
			alert: {
				title: payload.title,
				body: payload.body,
			},
			sound: payload.sound ?? 'default',
			...(payload.badge !== undefined ? {badge: payload.badge} : {}),
			...(payload.data ? {'content-available': 1} : {}),
		},
		...payload.data,
	}

	const response = await fetch(`https://api.push.apple.com/3/device/${token}`, {
		method: 'POST',
		headers: {
			authorization: `bearer ${jwt}`,
			'apns-topic': 'com.happyvibecode.app',
			'apns-push-type': 'alert',
			'apns-priority': '10',
			'content-type': 'application/json',
		},
		body: JSON.stringify(apnsPayload),
	})

	if (!response.ok) {
		const errorText = await response.text()
		console.error(
			`[APNs] Send failed for token ${token.slice(0, 8)}...: ${response.status} ${errorText}`,
		)
		return false
	}

	return true
}

export interface PushServiceEnv {
	FCM_SERVICE_ACCOUNT_KEY?: string
	APNS_AUTH_KEY?: string
	APNS_KEY_ID?: string
	APNS_TEAM_ID?: string
}

export async function sendPushToUser(
	userId: string,
	payload: PushPayload,
	env: PushServiceEnv & {DB: D1Database},
): Promise<void> {
	const {createDb} = await import('@happy-vibecode/db')
	const db = createDb(env.DB)

	const devices = await db.query.deviceTokens.findMany({
		where: (d, {eq}) => eq(d.userId, userId),
	})

	if (devices.length === 0) return

	const results = await Promise.allSettled(
		devices.map(async device => {
			if (device.platform === 'android' && env.FCM_SERVICE_ACCOUNT_KEY) {
				return sendFcmNotification(
					device.token,
					payload,
					env.FCM_SERVICE_ACCOUNT_KEY,
				)
			}
			if (
				device.platform === 'ios' &&
				env.APNS_AUTH_KEY &&
				env.APNS_KEY_ID &&
				env.APNS_TEAM_ID
			) {
				return sendApnsNotification(
					device.token,
					payload,
					env.APNS_AUTH_KEY,
					env.APNS_KEY_ID,
					env.APNS_TEAM_ID,
				)
			}
			return false
		}),
	)

	const failed = results.filter(
		r => r.status === 'rejected' || r.value === false,
	).length
	if (failed > 0) {
		console.warn(
			`[PushService] ${failed}/${devices.length} push sends failed for user ${userId}`,
		)
	}
}
