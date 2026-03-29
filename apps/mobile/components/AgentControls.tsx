import {
	Alert,
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native'
import {Ionicons} from '@expo/vector-icons'
import {useState} from 'react'

interface AgentControlsProps {
	connected: boolean
	cliConnected: boolean
	sessionId: string
	onSend: (msg: object) => void
	logs: {id: string; content: string; level: string}[]
	agentStatus: string | null
}

export function AgentControls({
	connected,
	cliConnected,
	sessionId,
	onSend,
	logs,
	agentStatus,
}: AgentControlsProps) {
	const [params, setParams] = useState<Record<string, string>>({})
	const [newParamKey, setNewParamKey] = useState('')
	const [newParamValue, setNewParamValue] = useState('')
	const [showLogs, setShowLogs] = useState(false)
	const [showParams, setShowParams] = useState(false)

	const handleStart = () => {
		onSend({
			type: 'agent_start',
			agentType: 'default',
			sessionId,
			parameters: Object.keys(params).length > 0 ? params : undefined,
		})
	}

	const handleStop = () => {
		Alert.alert('Stop Agent', 'Stop the running agent?', [
			{text: 'Cancel', style: 'cancel'},
			{
				text: 'Stop',
				style: 'destructive',
				onPress: () =>
					onSend({
						type: 'agent_stop',
						sessionId,
						reason: 'User requested stop',
					}),
			},
		])
	}

	const handleAddParam = () => {
		if (!newParamKey.trim()) return
		setParams(prev => ({...prev, [newParamKey.trim()]: newParamValue}))
		setNewParamKey('')
		setNewParamValue('')
	}

	const handleRemoveParam = (key: string) => {
		setParams(prev => {
			const next = {...prev}
			delete next[key]
			return next
		})
	}

	const handleApplyParams = () => {
		onSend({
			type: 'agent_params',
			sessionId,
			parameters: params,
		})
	}

	if (!cliConnected) return null

	return (
		<View className="border-t border-border dark:border-border-dark">
			{/* Status bar */}
			<View className="flex-row items-center justify-between px-4 py-2 bg-card dark:bg-card-dark">
				<View className="flex-row items-center gap-2">
					<View
						className={`w-2 h-2 rounded-full ${
							agentStatus === 'running'
								? 'bg-success'
								: agentStatus === 'error'
									? 'bg-error'
									: agentStatus === 'requires_input'
										? 'bg-warning'
										: 'bg-muted dark:bg-muted-dark'
						}`}
					/>
					<Text className="text-xs text-muted dark:text-muted-dark">
						{agentStatus ? agentStatus.replace('_', ' ').toUpperCase() : 'IDLE'}
					</Text>
				</View>
				<View className="flex-row gap-1">
					<TouchableOpacity
						className="p-1.5"
						onPress={() => setShowLogs(v => !v)}
						accessibilityLabel="Toggle logs"
					>
						<Ionicons
							name="terminal-outline"
							size={18}
							color={showLogs ? '#7c3aed' : '#94a3b8'}
						/>
					</TouchableOpacity>
					<TouchableOpacity
						className="p-1.5"
						onPress={() => setShowParams(v => !v)}
						accessibilityLabel="Toggle parameters"
					>
						<Ionicons
							name="settings-outline"
							size={18}
							color={showParams ? '#7c3aed' : '#94a3b8'}
						/>
					</TouchableOpacity>
				</View>
			</View>

			{/* Control buttons */}
			<View className="flex-row gap-2 px-4 py-2">
				<TouchableOpacity
					className={`flex-1 rounded-xl py-2.5 items-center flex-row justify-center gap-2 ${
						agentStatus === 'running'
							? 'bg-border dark:bg-border-dark'
							: 'bg-success/20 border border-success/40'
					}`}
					onPress={handleStart}
					disabled={agentStatus === 'running'}
					accessibilityLabel="Start agent"
				>
					<Ionicons name="play" size={14} color="#22c55e" />
					<Text className="text-success font-semibold text-sm">Start</Text>
				</TouchableOpacity>
				<TouchableOpacity
					className={`flex-1 rounded-xl py-2.5 items-center flex-row justify-center gap-2 ${
						agentStatus !== 'running'
							? 'bg-border dark:bg-border-dark'
							: 'bg-error/20 border border-error/40'
					}`}
					onPress={handleStop}
					disabled={agentStatus !== 'running'}
					accessibilityLabel="Stop agent"
				>
					<Ionicons name="stop" size={14} color="#ef4444" />
					<Text className="text-error font-semibold text-sm">Stop</Text>
				</TouchableOpacity>
			</View>

			{/* Parameters panel */}
			{showParams && (
				<View className="px-4 pb-2 gap-2">
					<Text className="text-xs font-semibold text-muted dark:text-muted-dark uppercase">
						Parameters
					</Text>
					{Object.entries(params).map(([key, value]) => (
						<View
							key={key}
							className="flex-row items-center justify-between bg-surface dark:bg-surface-dark rounded-lg px-3 py-2"
						>
							<Text className="text-text dark:text-text-dark text-xs flex-1">
								{key}: {value}
							</Text>
							<TouchableOpacity onPress={() => handleRemoveParam(key)}>
								<Ionicons name="close-circle" size={16} color="#ef4444" />
							</TouchableOpacity>
						</View>
					))}
					<View className="flex-row gap-2">
						<TextInput
							className="flex-1 bg-surface dark:bg-surface-dark rounded-lg px-3 py-2 text-text dark:text-text-dark text-xs"
							placeholder="Key"
							placeholderTextColor="#64748b"
							value={newParamKey}
							onChangeText={setNewParamKey}
						/>
						<TextInput
							className="flex-1 bg-surface dark:bg-surface-dark rounded-lg px-3 py-2 text-text dark:text-text-dark text-xs"
							placeholder="Value"
							placeholderTextColor="#64748b"
							value={newParamValue}
							onChangeText={setNewParamValue}
						/>
						<TouchableOpacity
							className="bg-primary rounded-lg px-3 justify-center"
							onPress={handleAddParam}
						>
							<Ionicons name="add" size={16} color="white" />
						</TouchableOpacity>
					</View>
					{Object.keys(params).length > 0 && (
						<TouchableOpacity
							className="bg-primary/20 border border-primary/40 rounded-lg py-2 items-center"
							onPress={handleApplyParams}
						>
							<Text className="text-primary text-xs font-semibold">
								Apply Parameters
							</Text>
						</TouchableOpacity>
					)}
				</View>
			)}

			{/* Logs panel */}
			{showLogs && logs.length > 0 && (
				<View className="px-4 pb-2 max-h-48">
					<Text className="text-xs font-semibold text-muted dark:text-muted-dark uppercase mb-1">
						Logs
					</Text>
					<ScrollView
						className="bg-surface dark:bg-surface-dark rounded-lg p-2"
						nestedScrollEnabled
					>
						{logs.map(log => (
							<Text
								key={log.id}
								className={`text-xs font-mono ${
									log.level === 'error'
										? 'text-error'
										: log.level === 'warn'
											? 'text-warning'
											: 'text-text dark:text-text-dark'
								}`}
							>
								{log.content}
							</Text>
						))}
					</ScrollView>
				</View>
			)}
		</View>
	)
}
