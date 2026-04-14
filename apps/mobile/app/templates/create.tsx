import {
	Alert,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	View,
	Text,
	TouchableOpacity,
} from 'react-native'
import {SafeAreaView} from 'react-native-safe-area-context'
import {TemplateForm} from '../../components/TemplateForm'
import {useTemplates} from '../../hooks/useTemplates'
import {useAuth} from '../../hooks/useAuth'
import {Ionicons} from '@expo/vector-icons'
import {useRouter} from 'expo-router'

export default function CreateTemplateScreen() {
	const {apiToken, serverUrl} = useAuth()
	const {createTemplate} = useTemplates(apiToken, serverUrl)
	const router = useRouter()

	const handleSubmit = async (data: {
		name: string
		description?: string
		promptTemplate: string
		defaultModel?: string
		tags?: string[]
	}) => {
		try {
			await createTemplate(data)
			Alert.alert('Success', 'Template created.')
			router.back()
		} catch (err) {
			Alert.alert('Error', (err as Error).message)
		}
	}

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
				<Text className="text-text dark:text-text-dark font-semibold">
					New Template
				</Text>
			</View>

			<KeyboardAvoidingView
				className="flex-1"
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			>
				<ScrollView
					className="flex-1"
					contentContainerStyle={{padding: 16}}
					keyboardShouldPersistTaps="handled"
				>
					<TemplateForm
						onSubmit={handleSubmit}
						submitLabel="Create Template"
					/>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	)
}
