const {getDefaultConfig} = require('expo/metro-config')
const {withNativeWind} = require('nativewind/metro')
const path = require('path')

const config = getDefaultConfig(__dirname)

// Conditionally intercept native modules that are absent or have API mismatches.
// resolveRequest tries the real module first; falls back to shim only when the
// native module is unavailable (Expo Go, or dev client built without it).
//
// Shimmed modules:
//   expo-network     — @better-auth/expo network state monitoring (no-op safe)
//   expo-web-browser — OAuth browser sessions; shim falls back to Linking.openURL
//   expo-secure-store — encrypted KV; shim falls back to AsyncStorage (unencrypted)
//
// To restore real native behaviour, build a dev client:
//   npx expo run:android   (local)
//   eas build --profile development --platform android   (EAS)
const SHIMS = {
	'expo-network': path.resolve(__dirname, 'shims/expo-network.js'),
	'expo-web-browser': path.resolve(__dirname, 'shims/expo-web-browser.js'),
	'expo-secure-store': path.resolve(__dirname, 'shims/expo-secure-store.js'),
}

config.resolver = {
	...config.resolver,
	resolveRequest: (context, moduleName, platform) => {
		const shimPath = SHIMS[moduleName]
		if (shimPath) {
			try {
				// Try the real native module first — available in dev client builds
				return context.resolveRequest(context, moduleName, platform)
			} catch {
				// Fall back to shim when native module is unavailable (Expo Go, missing build)
				return {filePath: shimPath, type: 'sourceFile'}
			}
		}
		return context.resolveRequest(context, moduleName, platform)
	},
}

module.exports = withNativeWind(config, {input: './global.css'})
