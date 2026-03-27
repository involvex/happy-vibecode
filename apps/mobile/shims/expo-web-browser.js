'use strict'
// Shim for expo-web-browser when native module 'ExpoWebBrowser' is unavailable.
// This happens when running in Expo Go or a dev client built without this module.
// GitHub OAuth redirect capture won't work with this shim — use the web app for OAuth,
// or rebuild the dev client: `npx expo run:android` / `eas build --profile development`.

let _Linking = null
function getLinking() {
	if (!_Linking) {
		try {
			_Linking = require('expo-linking')
		} catch {
			_Linking = {openURL: async () => {}}
		}
	}
	return _Linking
}

const WebBrowserResultType = {
	CANCEL: 'cancel',
	DISMISS: 'dismiss',
	OPENED: 'opened',
	LOCKED: 'locked',
}

module.exports = {
	WebBrowserResultType,

	openAuthSessionAsync: async (url, _redirectUrl, _options) => {
		console.warn(
			'[expo-web-browser shim] openAuthSessionAsync: native module unavailable.' +
				' Falling back to Linking.openURL — OAuth redirect will not be captured.',
		)
		try {
			await getLinking().openURL(url)
		} catch (e) {
			console.warn('[expo-web-browser shim] Failed to open URL:', e?.message)
		}
		return {type: 'cancel'}
	},

	dismissAuthSession: () => {},
	dismissBrowser: () => {},

	openBrowserAsync: async (url, _options) => {
		try {
			await getLinking().openURL(url)
			return {type: 'opened'}
		} catch {
			return {type: 'cancel'}
		}
	},

	maybeCompleteAuthSession: _options => ({type: 'success', message: null}),
}
