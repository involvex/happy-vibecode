'use strict'
// Shim for expo-secure-store when native module is unavailable or has an API
// mismatch (e.g. running with an older dev client / Expo Go and SDK 55 JS).
// Falls back to @react-native-async-storage/async-storage (unencrypted).
// Build a native dev client for real encrypted storage: `npx expo run:android`.

let _storage = null

function getStorage() {
	if (_storage) return _storage
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

	getItemAsync: (key, _options) => {
		console.warn(
			'[expo-secure-store shim] Using AsyncStorage fallback (unencrypted)',
		)
		return getStorage().getItem(key)
	},

	setItemAsync: (key, value, _options) => {
		console.warn(
			'[expo-secure-store shim] Using AsyncStorage fallback (unencrypted)',
		)
		return getStorage().setItem(key, value)
	},

	deleteItemAsync: (key, _options) => {
		return getStorage().removeItem(key)
	},

	// canUseBiometricAuthentication — not available in shim
	canUseBiometricAuthentication: async () => false,

	isAvailableAsync: async () => true,
}
