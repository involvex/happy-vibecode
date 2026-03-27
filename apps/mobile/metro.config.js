const {getDefaultConfig} = require('expo/metro-config')
const {withNativeWind} = require('nativewind/metro')
const path = require('path')

const config = getDefaultConfig(__dirname)

// Force-intercept native modules that are absent or have API mismatches when
// running in Expo Go or a dev client built without them. resolveRequest runs
// BEFORE node_modules lookup, so it overrides even properly-installed packages
// (unlike extraNodeModules which is fallback-only).
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
			return {filePath: shimPath, type: 'sourceFile'}
		}
		return context.resolveRequest(context, moduleName, platform)
	},
}

module.exports = withNativeWind(config, {input: './global.css'})
