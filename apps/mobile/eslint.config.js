import expo from 'eslint-config-expo/flat.js'

export default [
	...expo,
	{
		ignores: ['node_modules/', '.expo/', 'dist/'],
	},
]
