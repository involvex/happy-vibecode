/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
	presets: [require('nativewind/preset')],
	theme: {
		extend: {
			colors: {
				primary: '#7c3aed',
				surface: '#1a1a2e',
				card: '#16213e',
				border: '#2a2a4a',
				text: '#e2e8f0',
				muted: '#94a3b8',
				success: '#22c55e',
				warning: '#f59e0b',
				error: '#ef4444',
			},
		},
	},
	plugins: [],
}
