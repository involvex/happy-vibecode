/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
	presets: [require('nativewind/preset')],
	theme: {
		extend: {
			colors: {
				primary: '#7c3aed',
				// Light defaults — dark: variants activate in dark color scheme
				surface: {DEFAULT: '#f1f5f9', dark: '#1a1a2e'},
				card: {DEFAULT: '#ffffff', dark: '#16213e'},
				border: {DEFAULT: '#e2e8f0', dark: '#2a2a4a'},
				text: {DEFAULT: '#1e293b', dark: '#e2e8f0'},
				muted: {DEFAULT: '#64748b', dark: '#94a3b8'},
				success: '#22c55e',
				warning: '#f59e0b',
				error: '#ef4444',
			},
		},
	},
	plugins: [],
}
