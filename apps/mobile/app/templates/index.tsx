import {
	Alert,
	FlatList,
	RefreshControl,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native'
import {SafeAreaView} from 'react-native-safe-area-context'
import {useTemplates} from '../../hooks/useTemplates'
import {useAuth} from '../../hooks/useAuth'
import {Ionicons} from '@expo/vector-icons'
import {useRouter} from 'expo-router'
import {useState} from 'react'

export default function TemplatesScreen() {
	const {apiToken, serverUrl} = useAuth()
	const router = useRouter()
	const {
		templates,
		isLoading,
		fetchTemplates,
		instantiate,
		deleteTemplate,
		duplicate,
		togglePublic,
	} = useTemplates(apiToken, serverUrl)

	const [search, setSearch] = useState('')
	const [filter, setFilter] = useState<'all' | 'me' | 'public'>('all')

	const filtered = templates.filter(
		t =>
			!search ||
			t.name.toLowerCase().includes(search.toLowerCase()) ||
			t.description?.toLowerCase().includes(search.toLowerCase()),
	)

	const handleInstantiate = (templateId: string, name: string) => {
		Alert.alert('Launch Agent', `Create a new agent session from "${name}"?`, [
			{text: 'Cancel', style: 'cancel'},
			{
				text: 'Launch',
				onPress: async () => {
					try {
						const result = await instantiate(templateId)
						router.push(`/session/${result.session.id}`)
					} catch (err) {
						Alert.alert('Error', (err as Error).message)
					}
				},
			},
		])
	}

	const handleDelete = (id: string, name: string) => {
		Alert.alert('Delete Template', `Delete "${name}"? This cannot be undone.`, [
			{text: 'Cancel', style: 'cancel'},
			{text: 'Delete', style: 'destructive', onPress: () => deleteTemplate(id)},
		])
	}

	const handleDuplicate = async (id: string) => {
		try {
			const t = await duplicate(id)
			router.push(`/templates/${t.id}` as never)
		} catch (err) {
			Alert.alert('Error', (err as Error).message)
		}
	}

	return (
		<SafeAreaView
			className="flex-1 bg-surface dark:bg-surface-dark"
			edges={['top']}
		>
			<View className="px-4 py-3 border-b border-border dark:border-border-dark flex-row items-center justify-between">
				<Text className="text-text dark:text-text-dark text-lg font-semibold">
					Templates
				</Text>
				<TouchableOpacity
					onPress={() => router.push('/templates/create' as never)}
				>
					<Ionicons
						name="add-circle-outline"
						size={26}
						color="#7c3aed"
					/>
				</TouchableOpacity>
			</View>

			{/* Search & filter */}
			<View className="px-4 pt-3 gap-2">
				<TextInput
					className="bg-card dark:bg-card-dark border border-border dark:border-border-dark rounded-xl px-4 py-2.5 text-text dark:text-text-dark text-sm"
					placeholder="Search templates..."
					placeholderTextColor="#64748b"
					value={search}
					onChangeText={setSearch}
				/>
				<View className="flex-row gap-2">
					{(['all', 'me', 'public'] as const).map(f => (
						<TouchableOpacity
							key={f}
							className={`rounded-full px-3 py-1.5 ${
								filter === f
									? 'bg-primary'
									: 'bg-card dark:bg-card-dark border border-border dark:border-border-dark'
							}`}
							onPress={() => {
								setFilter(f)
								fetchTemplates(f)
							}}
						>
							<Text
								className={`text-xs font-medium ${
									filter === f
										? 'text-white'
										: 'text-muted dark:text-muted-dark'
								}`}
							>
								{f === 'all' ? 'All' : f === 'me' ? 'Mine' : 'Public'}
							</Text>
						</TouchableOpacity>
					))}
				</View>
			</View>

			<FlatList
				data={filtered}
				keyExtractor={item => item.id}
				contentContainerStyle={{padding: 16, gap: 12}}
				refreshControl={
					<RefreshControl
						refreshing={isLoading}
						onRefresh={() => fetchTemplates(filter)}
					/>
				}
				renderItem={({item}) => (
					<View className="bg-card dark:bg-card-dark border border-border dark:border-border-dark rounded-2xl p-4">
						<View className="flex-row items-start justify-between mb-2">
							<View className="flex-1 mr-2">
								<View className="flex-row items-center gap-2">
									<Text className="text-text dark:text-text-dark font-semibold text-base">
										{item.name}
									</Text>
									{item.isPublic && (
										<Ionicons
											name="globe-outline"
											size={14}
											color="#7c3aed"
										/>
									)}
								</View>
								{item.description && (
									<Text
										className="text-muted dark:text-muted-dark text-xs mt-0.5"
										numberOfLines={2}
									>
										{item.description}
									</Text>
								)}
							</View>
						</View>

						{/* Tags */}
						{item.tags && (item.tags as string[]).length > 0 && (
							<View className="flex-row flex-wrap gap-1 mb-3">
								{(item.tags as string[]).map((tag: string) => (
									<View
										key={tag}
										className="bg-primary/10 rounded-full px-2 py-0.5"
									>
										<Text className="text-primary text-xs">{tag}</Text>
									</View>
								))}
							</View>
						)}

						{/* Actions */}
						<View className="flex-row gap-2">
							<TouchableOpacity
								className="flex-1 bg-primary rounded-xl py-2 items-center flex-row justify-center gap-1.5"
								onPress={() => handleInstantiate(item.id, item.name)}
							>
								<Ionicons
									name="play"
									size={14}
									color="white"
								/>
								<Text className="text-white text-xs font-semibold">Launch</Text>
							</TouchableOpacity>
							<TouchableOpacity
								className="bg-surface dark:bg-surface-dark rounded-xl p-2"
								onPress={() => router.push(`/templates/${item.id}` as never)}
								accessibilityLabel="View template details"
							>
								<Ionicons
									name="eye-outline"
									size={18}
									color="#94a3b8"
								/>
							</TouchableOpacity>
							<TouchableOpacity
								className="bg-surface dark:bg-surface-dark rounded-xl p-2"
								onPress={() => handleDuplicate(item.id)}
								accessibilityLabel="Duplicate template"
							>
								<Ionicons
									name="copy-outline"
									size={18}
									color="#94a3b8"
								/>
							</TouchableOpacity>
							<TouchableOpacity
								className="bg-surface dark:bg-surface-dark rounded-xl p-2"
								onPress={() => togglePublic(item.id, !item.isPublic)}
								accessibilityLabel={
									item.isPublic ? 'Make private' : 'Make public'
								}
							>
								<Ionicons
									name={item.isPublic ? 'lock-closed-outline' : 'globe-outline'}
									size={18}
									color="#94a3b8"
								/>
							</TouchableOpacity>
							<TouchableOpacity
								className="bg-surface dark:bg-surface-dark rounded-xl p-2"
								onPress={() => handleDelete(item.id, item.name)}
								accessibilityLabel="Delete template"
							>
								<Ionicons
									name="trash-outline"
									size={18}
									color="#ef4444"
								/>
							</TouchableOpacity>
						</View>
					</View>
				)}
				ListEmptyComponent={
					<View className="items-center py-12">
						<Ionicons
							name="document-text-outline"
							size={48}
							color="#64748b"
						/>
						<Text className="text-muted dark:text-muted-dark text-sm mt-3">
							{search ? 'No templates match your search' : 'No templates yet'}
						</Text>
						{!search && (
							<TouchableOpacity
								className="mt-3 bg-primary rounded-xl px-4 py-2"
								onPress={() => router.push('/templates/create' as never)}
							>
								<Text className="text-white text-sm font-semibold">
									Create Template
								</Text>
							</TouchableOpacity>
						)}
					</View>
				}
			/>
		</SafeAreaView>
	)
}
