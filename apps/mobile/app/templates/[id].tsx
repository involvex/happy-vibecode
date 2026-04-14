import {Alert, ScrollView, Text, TouchableOpacity, View} from 'react-native'
import {SafeAreaView} from 'react-native-safe-area-context'
import {useLocalSearchParams, useRouter} from 'expo-router'
import {useTemplates} from '../../hooks/useTemplates'
import {useAuth} from '../../hooks/useAuth'
import {Ionicons} from '@expo/vector-icons'
import {useEffect, useState} from 'react'

interface AgentTemplate {
	id: string
	userId: string
	name: string
	description?: string | null
	tags: string[] | string
	isPublic: boolean | number
	latestVersionId?: string | null
	createdAt: string
	updatedAt: string
}

interface AgentTemplateVersion {
	id: string
	templateId: string
	version: number
	promptTemplate: string
	defaultModel?: string | null
	defaultProvider?: string | null
	tools: string[] | string
	parameters: Record<string, unknown> | string
	changeNotes?: string | null
	createdAt: string
}

const DEFAULT_URL = 'https://happy-vibecode.involvex.workers.dev'

export default function TemplateDetailScreen() {
	const {id} = useLocalSearchParams<{id: string}>()
	const {apiToken, serverUrl} = useAuth()
	const router = useRouter()
	const {instantiate, deleteTemplate} = useTemplates(apiToken, serverUrl)

	const [template, setTemplate] = useState<AgentTemplate | null>(null)
	const [versions, setVersions] = useState<AgentTemplateVersion[]>([])
	const [loading, setLoading] = useState(true)

	const baseUrl = serverUrl ?? DEFAULT_URL

	useEffect(() => {
		if (!apiToken || !id) return
		const headers = {
			'Content-Type': 'application/json',
			...(apiToken ? {Authorization: `Bearer ${apiToken}`} : {}),
		}
		Promise.all([
			fetch(`${baseUrl}/api/templates/${id}`, {headers}).then(
				r =>
					r.json() as Promise<{
						template: AgentTemplate
						versions: AgentTemplateVersion[]
					}>,
			),
		])
			.then(([data]) => {
				setTemplate(data.template)
				setVersions(data.versions)
			})
			.catch(() => router.back())
			.finally(() => setLoading(false))
	}, [apiToken, baseUrl, id, router])

	const handleInstantiate = () => {
		if (!template) return
		Alert.alert(
			'Launch Agent',
			`Create a new agent session from "${template.name}"?`,
			[
				{text: 'Cancel', style: 'cancel'},
				{
					text: 'Launch',
					onPress: async () => {
						try {
							const result = await instantiate(template.id)
							router.push(`/session/${result.session.id}`)
						} catch (err) {
							Alert.alert('Error', (err as Error).message)
						}
					},
				},
			],
		)
	}

	const handleDelete = () => {
		if (!template) return
		Alert.alert(
			'Delete Template',
			`Delete "${template.name}"? This cannot be undone.`,
			[
				{text: 'Cancel', style: 'cancel'},
				{
					text: 'Delete',
					style: 'destructive',
					onPress: async () => {
						await deleteTemplate(template.id)
						router.back()
					},
				},
			],
		)
	}

	if (loading || !template) {
		return (
			<SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark items-center justify-center">
				<Text className="text-muted dark:text-muted-dark">Loading...</Text>
			</SafeAreaView>
		)
	}

	const latestVersion = versions[0]

	return (
		<SafeAreaView
			className="flex-1 bg-surface dark:bg-surface-dark"
			edges={['top']}
		>
			<View className="flex-row items-center gap-3 px-4 py-3 border-b border-border dark:border-border-dark">
				<TouchableOpacity onPress={() => router.back()}>
					<Ionicons
						name="arrow-back"
						size={22}
						color="#7c3aed"
					/>
				</TouchableOpacity>
				<Text
					className="flex-1 text-text dark:text-text-dark font-semibold"
					numberOfLines={1}
				>
					{template.name}
				</Text>
				<TouchableOpacity onPress={handleDelete}>
					<Ionicons
						name="trash-outline"
						size={20}
						color="#ef4444"
					/>
				</TouchableOpacity>
			</View>

			<ScrollView
				className="flex-1"
				contentContainerStyle={{padding: 16, gap: 16}}
			>
				{/* Info */}
				<View className="bg-card dark:bg-card-dark border border-border dark:border-border-dark rounded-2xl p-4 gap-3">
					{template.description && (
						<Text className="text-text dark:text-text-dark text-sm">
							{template.description}
						</Text>
					)}
					<View className="flex-row items-center gap-2">
						{template.isPublic && (
							<View className="bg-primary/10 rounded-full px-2 py-0.5">
								<Text className="text-primary text-xs">Public</Text>
							</View>
						)}
						<Text className="text-muted dark:text-muted-dark text-xs">
							{versions.length} version{versions.length !== 1 ? 's' : ''}
						</Text>
					</View>
					{template.tags && (template.tags as string[]).length > 0 && (
						<View className="flex-row flex-wrap gap-1">
							{(template.tags as string[]).map((tag: string) => (
								<View
									key={tag}
									className="bg-primary/10 rounded-full px-2 py-0.5"
								>
									<Text className="text-primary text-xs">{tag}</Text>
								</View>
							))}
						</View>
					)}
				</View>

				{/* Launch button */}
				<TouchableOpacity
					className="bg-primary rounded-2xl py-3.5 items-center flex-row justify-center gap-2"
					onPress={handleInstantiate}
				>
					<Ionicons
						name="play"
						size={16}
						color="white"
					/>
					<Text className="text-white font-semibold">Launch Agent</Text>
				</TouchableOpacity>

				{/* Latest version */}
				{latestVersion && (
					<View className="bg-card dark:bg-card-dark border border-border dark:border-border-dark rounded-2xl p-4 gap-3">
						<Text className="text-text dark:text-text-dark font-semibold text-sm">
							Latest Version (v{latestVersion.version})
						</Text>
						{latestVersion.defaultModel && (
							<View className="flex-row items-center gap-2">
								<Text className="text-muted dark:text-muted-dark text-xs">
									Model:
								</Text>
								<View className="bg-surface dark:bg-surface-dark rounded px-2 py-0.5">
									<Text className="text-text dark:text-text-dark text-xs">
										{latestVersion.defaultModel}
									</Text>
								</View>
							</View>
						)}
						<View>
							<Text className="text-muted dark:text-muted-dark text-xs mb-1">
								Prompt:
							</Text>
							<Text className="text-text dark:text-text-dark text-xs font-mono">
								{latestVersion.promptTemplate}
							</Text>
						</View>
					</View>
				)}

				{/* Version history */}
				{versions.length > 1 && (
					<View className="gap-2">
						<Text className="text-text dark:text-text-dark font-semibold text-sm uppercase tracking-wide">
							Version History
						</Text>
						{versions.map(v => (
							<View
								key={v.id}
								className="bg-card dark:bg-card-dark border border-border dark:border-border-dark rounded-xl px-4 py-3"
							>
								<View className="flex-row items-center justify-between">
									<Text className="text-text dark:text-text-dark text-sm font-medium">
										v{v.version}
									</Text>
									<Text className="text-muted dark:text-muted-dark text-xs">
										{new Date(v.createdAt).toLocaleDateString()}
									</Text>
								</View>
								{v.changeNotes && (
									<Text className="text-muted dark:text-muted-dark text-xs mt-1">
										{v.changeNotes}
									</Text>
								)}
							</View>
						))}
					</View>
				)}
			</ScrollView>
		</SafeAreaView>
	)
}
