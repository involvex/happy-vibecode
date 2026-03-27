const {getDefaultConfig} = require('expo/metro-config')
const {withNativeWind} = require('nativewind/metro')
const path = require('path')

const config = getDefaultConfig(__dirname)

// Redirect expo-network imports to a native-module-free shim.
// @better-auth/expo dynamically imports expo-network for network state
// monitoring.  The real native module (ExpoNetwork) is not included in
// standard Expo Go or existing dev client builds, which causes a hard crash.
config.resolver = {
	...config.resolver,
	extraNodeModules: {
		...config.resolver?.extraNodeModules,
		'expo-network': path.resolve(__dirname, 'shims/expo-network.js'),
	},
}

module.exports = withNativeWind(config, {input: './global.css'})
