import {Alert, Text, TextInput, TouchableOpacity, View} from 'react-native'
import {Ionicons} from '@expo/vector-icons'
import {useState} from 'react'

interface TemplateFormProps {
	initialName?: string
	initialDescription?: string
	initialPrompt?: string
	initialModel?: string
	initialTags?: string[]
	onSubmit: (data: {
		name: string
		description?: string
		promptTemplate: string
		defaultModel?: string
		tags?: string[]
	}) => Promise<void>
	submitLabel: string
}

export function TemplateForm({
	initialName = '',
	initialDescription = '',
	initialPrompt = '',
	initialModel = '',
	initialTags = [],
	onSubmit,
	submitLabel,
}: TemplateFormProps) {
	const [name, setName] = useState(initialName)
	const [description, setDescription] = useState(initialDescription)
	const [prompt, setPrompt] = useState(initialPrompt)
	const [model, setModel] = useState(initialModel)
	const [tagInput, setTagInput] = useState('')
	const [tags, setTags] = useState<string[]>(initialTags)
	const [loading, setLoading] = useState(false)

	const handleAddTag = () => {
		const tag = tagInput.trim().toLowerCase()
		if (tag && !tags.includes(tag)) {
			setTags(prev => [...prev, tag])
		}
		setTagInput('')
	}

	const handleRemoveTag = (tag: string) => {
		setTags(prev => prev.filter(t => t !== tag))
	}

	const handleSubmit = async () => {
		if (!name.trim() || !prompt.trim()) {
			Alert.alert('Required', 'Name and prompt template are required.')
			return
		}
		setLoading(true)
		try {
			await onSubmit({
				name: name.trim(),
				description: description.trim() || undefined,
				promptTemplate: prompt.trim(),
				defaultModel: model.trim() || undefined,
				tags: tags.length > 0 ? tags : undefined,
			})
		} catch (err) {
			Alert.alert('Error', (err as Error).message)
		} finally {
			setLoading(false)
		}
	}

	return (
		<View className="gap-4">
			<View>
				<Text className="text-muted dark:text-muted-dark text-xs mb-1">
					Name *
				</Text>
				<TextInput
					className="bg-card dark:bg-card-dark border border-border dark:border-border-dark rounded-xl px-4 py-3 text-text dark:text-text-dark text-sm"
					placeholder="My Template"
					placeholderTextColor="#64748b"
					value={name}
					onChangeText={setName}
				/>
			</View>

			<View>
				<Text className="text-muted dark:text-muted-dark text-xs mb-1">
					Description
				</Text>
				<TextInput
					className="bg-card dark:bg-card-dark border border-border dark:border-border-dark rounded-xl px-4 py-3 text-text dark:text-text-dark text-sm"
					placeholder="What this template does..."
					placeholderTextColor="#64748b"
					value={description}
					onChangeText={setDescription}
					multiline
					numberOfLines={2}
				/>
			</View>

			<View>
				<Text className="text-muted dark:text-muted-dark text-xs mb-1">
					Prompt Template *
				</Text>
				<TextInput
					className="bg-card dark:bg-card-dark border border-border dark:border-border-dark rounded-xl px-4 py-3 text-text dark:text-text-dark text-sm min-h-[120px]"
					placeholder="You are an expert developer. Review the following code and..."
					placeholderTextColor="#64748b"
					value={prompt}
					onChangeText={setPrompt}
					multiline
					textAlignVertical="top"
				/>
			</View>

			<View>
				<Text className="text-muted dark:text-muted-dark text-xs mb-1">
					Default Model
				</Text>
				<TextInput
					className="bg-card dark:bg-card-dark border border-border dark:border-border-dark rounded-xl px-4 py-3 text-text dark:text-text-dark text-sm"
					placeholder="gpt-4, claude-3-opus, etc."
					placeholderTextColor="#64748b"
					value={model}
					onChangeText={setModel}
				/>
			</View>

			<View>
				<Text className="text-muted dark:text-muted-dark text-xs mb-1">
					Tags
				</Text>
				<View className="flex-row gap-2 mb-2">
					{tags.map(tag => (
						<View
							key={tag}
							className="bg-primary/20 rounded-full px-3 py-1 flex-row items-center gap-1"
						>
							<Text className="text-primary text-xs">{tag}</Text>
							<TouchableOpacity onPress={() => handleRemoveTag(tag)}>
								<Ionicons
									name="close"
									size={12}
									color="#7c3aed"
								/>
							</TouchableOpacity>
						</View>
					))}
				</View>
				<View className="flex-row gap-2">
					<TextInput
						className="flex-1 bg-card dark:bg-card-dark border border-border dark:border-border-dark rounded-xl px-4 py-2.5 text-text dark:text-text-dark text-sm"
						placeholder="Add tag"
						placeholderTextColor="#64748b"
						value={tagInput}
						onChangeText={setTagInput}
						onSubmitEditing={handleAddTag}
						returnKeyType="done"
					/>
					<TouchableOpacity
						className="bg-primary rounded-xl px-4 justify-center"
						onPress={handleAddTag}
					>
						<Ionicons
							name="add"
							size={18}
							color="white"
						/>
					</TouchableOpacity>
				</View>
			</View>

			<TouchableOpacity
				className={`rounded-xl py-3.5 items-center ${
					loading ? 'bg-border dark:bg-border-dark' : 'bg-primary'
				}`}
				onPress={handleSubmit}
				disabled={loading}
			>
				<Text className="text-white font-semibold">
					{loading ? 'Saving...' : submitLabel}
				</Text>
			</TouchableOpacity>
		</View>
	)
}
