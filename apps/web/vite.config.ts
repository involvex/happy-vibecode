import devtoolsJson from 'vite-plugin-devtools-json'
import {cloudflare} from '@cloudflare/vite-plugin'
import {defineConfig} from 'vite'
import vinext from 'vinext'

export default defineConfig({
	plugins: [
		vinext(),
		cloudflare({
			viteEnvironment: {
				name: 'rsc',
				childEnvironments: ['ssr'],
			},
		}),
		devtoolsJson(),
	],
	server: {
		host: true,
	},
	environments: {
		rsc: {
			optimizeDeps: {
				exclude: ['swr', '@ai-sdk/react'],
			},
		},
	},
})
