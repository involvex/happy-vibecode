/**
 * Minimal shim for expo-network used by @better-auth/expo.
 * The real native module (ExpoNetwork) requires a custom dev client build.
 * This shim provides the same API surface without native code so the JS bundle
 * works in Expo Go and existing dev builds.
 */

const NetworkStateType = {
	NONE: 'NONE',
	UNKNOWN: 'UNKNOWN',
	CELLULAR: 'CELLULAR',
	WIFI: 'WIFI',
	BLUETOOTH: 'BLUETOOTH',
	ETHERNET: 'ETHERNET',
	WIMAX: 'WIMAX',
	VPN: 'VPN',
	OTHER: 'OTHER',
}

async function getNetworkStateAsync() {
	return {
		type: NetworkStateType.UNKNOWN,
		isConnected: true,
		isInternetReachable: true,
	}
}

function addNetworkStateListener(_callback) {
	// No native event source — return a no-op subscription
	return {remove: () => {}}
}

async function getIpAddressAsync() {
	return '0.0.0.0'
}

async function isAirplaneModeEnabledAsync() {
	return false
}

module.exports = {
	NetworkStateType,
	getNetworkStateAsync,
	addNetworkStateListener,
	getIpAddressAsync,
	isAirplaneModeEnabledAsync,
}
