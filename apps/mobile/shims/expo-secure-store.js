'use strict'
// Shim for expo-secure-store when native module is unavailable or has an API
// mismatch (e.g. running with an older dev client / Expo Go and SDK 55 JS).
// Falls back to @react-native-async-storage/async-storage (unencrypted).
// Build a native dev client for real encrypted storage: `npx expo run:android`.

let _storage = null
let _storageLoading = false

function getStorage() {
	if (_storage) return _storage
	if (_storageLoading) return null
	_storageLoading = true
	try {
		_storage = require('@react-native-async-storage/async-storage').default
	} catch {
		// In-memory last resort
		const mem = new Map()
		_storage = {
			getItem: async k => mem.get(k) ?? null,
			setItem: async (k, v) => {
				mem.set(k, v)
			},
			removeItem: async k => {
				mem.delete(k)
			},
		}
	}
	return _storage
}

// In-memory cache for synchronous getItem/setItem required by @better-auth/expo/client.
// Async methods delegate to AsyncStorage for persistence.
const _cache = new Map()

function cacheGet(key) {
	return _cache.get(key) ?? null
}

function cacheSet(key, value) {
	_cache.set(key, value)
	// Fire-and-forget persist to AsyncStorage
	const storage = getStorage()
	if (storage) {
		storage.setItem(key, value).catch(() => {})
	}
}

function cacheDelete(key) {
	_cache.delete(key)
	const storage = getStorage()
	if (storage) {
		storage.removeItem(key).catch(() => {})
	}
}

const Accessible = {
	AFTER_FIRST_UNLOCK: 0,
	AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 1,
	ALWAYS: 2,
	WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: 3,
	ALWAYS_THIS_DEVICE_ONLY: 4,
	WHEN_UNLOCKED: 5,
	WHEN_UNLOCKED_THIS_DEVICE_ONLY: 6,
}

module.exports = {
	...Accessible,
	SecureStoreAccessible: Accessible,

	// Synchronous methods required by @better-auth/expo/client storage interface.
	// Uses in-memory cache with fire-and-forget AsyncStorage persistence.
	getItem: (key, _options) => cacheGet(key),

	setItem: (key, value, _options) => {
		cacheSet(key, value)
	},

	deleteItem: (key, _options) => {
		cacheDelete(key)
	},

	// Async methods for direct usage in hooks (useAuth, useWorkspaces).
	getItemAsync: async (key, _options) => {
		console.warn(
			'[expo-secure-store shim] Using AsyncStorage fallback (unencrypted)',
		)
		const storage = getStorage()
		if (storage) {
			const value = await storage.getItem(key)
			if (value !== null) _cache.set(key, value)
			return value
		}
		return cacheGet(key)
	},

	setItemAsync: async (key, value, _options) => {
		console.warn(
			'[expo-secure-store shim] Using AsyncStorage fallback (unencrypted)',
		)
		_cache.set(key, value)
		const storage = getStorage()
		if (storage) {
			await storage.setItem(key, value)
		}
	},

	deleteItemAsync: async (key, _options) => {
		_cache.delete(key)
		const storage = getStorage()
		if (storage) {
			await storage.removeItem(key)
		}
	},

	// canUseBiometricAuthentication — not available in shim
	canUseBiometricAuthentication: async () => false,

	isAvailableAsync: async () => true,
}
