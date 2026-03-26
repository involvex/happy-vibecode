import expo from 'eslint-config-expo/flat'

export default [
	...expo,
	{
		ignores: ['node_modules/', '.expo/', 'dist/'],
	},
]
