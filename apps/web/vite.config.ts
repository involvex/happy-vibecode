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
	publicDir: 'public',
	build: {
		copyPublicDir: true,
		emptyOutDir: true,
		outDir: 'dist',
	},
	environments: {
		rsc: {
			optimizeDeps: {
				exclude: ['swr', '@ai-sdk/react'],
			},
		},
	},
})
