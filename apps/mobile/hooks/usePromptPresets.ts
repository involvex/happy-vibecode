import AsyncStorage from '@react-native-async-storage/async-storage'
import {useCallback, useEffect, useState} from 'react'

const PRESETS_KEY = 'happy-prompt-presets'

export interface PromptPreset {
	id: string
	label: string
	text: string
}

const DEFAULT_PRESETS: PromptPreset[] = [
	{
		id: 'readme',
		label: '📄 README',
		text: 'Write a comprehensive README.md for this project with installation instructions, usage examples, and a description of what it does.',
	},
	{
		id: 'explain',
		label: '🔍 Explain',
		text: 'Explain what this code does in plain English, including the key algorithms and design decisions.',
	},
	{
		id: 'fix',
		label: '🐛 Fix bug',
		text: 'Find and fix the bug in this code. Explain what was wrong and how you fixed it.',
	},
	{
		id: 'tests',
		label: '🧪 Write tests',
		text: 'Write comprehensive unit tests for this code using the existing testing framework in this project.',
	},
	{
		id: 'review',
		label: '👀 Review',
		text: 'Review this code for bugs, security vulnerabilities, performance issues, and adherence to best practices.',
	},
	{
		id: 'summary',
		label: '📝 Summary',
		text: 'Summarize the recent changes in this codebase. What was added, changed, or fixed?',
	},
]

export function usePromptPresets() {
	const [presets, setPresets] = useState<PromptPreset[]>(DEFAULT_PRESETS)
	const [loaded, setLoaded] = useState(false)

	useEffect(() => {
		AsyncStorage.getItem(PRESETS_KEY).then(raw => {
			if (raw) {
				try {
					const saved = JSON.parse(raw) as PromptPreset[]
					if (Array.isArray(saved) && saved.length > 0) {
						setPresets(saved)
					}
				} catch {
					// malformed JSON, keep defaults
				}
			}
			setLoaded(true)
		})
	}, [])

	const savePresets = useCallback(async (next: PromptPreset[]) => {
		setPresets(next)
		await AsyncStorage.setItem(PRESETS_KEY, JSON.stringify(next))
	}, [])

	const addPreset = useCallback(
		async (label: string, text: string) => {
			const next: PromptPreset = {id: Date.now().toString(), label, text}
			await savePresets([...presets, next])
		},
		[presets, savePresets],
	)

	const removePreset = useCallback(
		async (id: string) => {
			await savePresets(presets.filter(p => p.id !== id))
		},
		[presets, savePresets],
	)

	const resetToDefaults = useCallback(async () => {
		await savePresets(DEFAULT_PRESETS)
	}, [savePresets])

	return {presets, loaded, addPreset, removePreset, resetToDefaults}
}
