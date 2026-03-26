'use client'
import {
	FolderSimpleIcon,
	PlusIcon,
	TrashIcon,
	CheckIcon,
} from '@phosphor-icons/react'
import type {Workspace} from '../hooks/useWorkspaces'
import {Button} from '@cloudflare/kumo'
import {useState} from 'react'

interface WorkspaceSelectorProps {
	workspaces: Workspace[]
	activeWorkspaceId: string | null
	onSelect: (id: string | null) => void
	onAdd: (workspace: Omit<Workspace, 'id' | 'isActive'>) => void
	onRemove: (id: string) => void
}

export function WorkspaceSelector({
	workspaces,
	activeWorkspaceId,
	onSelect,
	onAdd,
	onRemove,
}: WorkspaceSelectorProps) {
	const [showAddForm, setShowAddForm] = useState(false)
	const [newName, setNewName] = useState('')
	const [newPath, setNewPath] = useState('')
	const [newProvider, setNewProvider] = useState('')
	const [newModel, setNewModel] = useState('')

	const handleAdd = () => {
		if (!newName.trim() || !newPath.trim()) return
		onAdd({
			name: newName.trim(),
			path: newPath.trim(),
			defaultProvider: newProvider || undefined,
			defaultModel: newModel || undefined,
		})
		setNewName('')
		setNewPath('')
		setNewProvider('')
		setNewModel('')
		setShowAddForm(false)
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2 text-kumo-default font-semibold">
					<FolderSimpleIcon size={18} weight="duotone" />
					Workspaces
				</div>
				<Button
					variant="secondary"
					size="sm"
					onClick={() => setShowAddForm(v => !v)}
				>
					<PlusIcon size={16} />
					Add
				</Button>
			</div>

			{showAddForm && (
				<div className="bg-kumo-control rounded-lg p-4 space-y-3">
					<div>
						<label htmlFor="ws-name" className="sr-only">
							Workspace Name
						</label>
						<input
							id="ws-name"
							type="text"
							placeholder="Workspace name (e.g., My Project)"
							value={newName}
							onChange={e => setNewName(e.target.value)}
							className="w-full px-3 py-2 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default placeholder-kumo-inactive focus:outline-none focus:ring-2 focus:ring-kumo-ring"
						/>
					</div>
					<div>
						<label htmlFor="ws-path" className="sr-only">
							Directory Path
						</label>
						<input
							id="ws-path"
							type="text"
							placeholder="Directory path (e.g., C:\projects\myproject)"
							value={newPath}
							onChange={e => setNewPath(e.target.value)}
							className="w-full px-3 py-2 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default placeholder-kumo-inactive focus:outline-none focus:ring-2 focus:ring-kumo-ring"
						/>
					</div>
					<div className="grid grid-cols-2 gap-2">
						<div>
							<label htmlFor="ws-provider" className="sr-only">
								Default Provider
							</label>
							<select
								id="ws-provider"
								value={newProvider}
								onChange={e => setNewProvider(e.target.value)}
								className="w-full px-3 py-2 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default focus:outline-none focus:ring-2 focus:ring-kumo-ring"
							>
								<option value="">Provider (optional)</option>
								<option value="gemini">Gemini CLI</option>
								<option value="claude">Claude Code</option>
								<option value="codex">OpenAI Codex</option>
								<option value="opencode-ai">OpenCode AI</option>
								<option value="copilot">GitHub Copilot</option>
							</select>
						</div>
						<div>
							<label htmlFor="ws-model" className="sr-only">
								Default Model
							</label>
							<input
								id="ws-model"
								type="text"
								placeholder="Model (optional)"
								value={newModel}
								onChange={e => setNewModel(e.target.value)}
								className="w-full px-3 py-2 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default placeholder-kumo-inactive focus:outline-none focus:ring-2 focus:ring-kumo-ring"
							/>
						</div>
					</div>
					<div className="flex gap-2">
						<Button variant="primary" size="sm" onClick={handleAdd}>
							Add Workspace
						</Button>
						<Button
							variant="secondary"
							size="sm"
							onClick={() => setShowAddForm(false)}
						>
							Cancel
						</Button>
					</div>
				</div>
			)}

			{workspaces.length === 0 ? (
				<p className="text-sm text-kumo-inactive">
					No workspaces configured. Add one to get started.
				</p>
			) : (
				<div className="space-y-2">
					{workspaces.map(ws => (
						<div
							key={ws.id}
							className={`flex items-center justify-between p-3 rounded-lg border ${
								ws.id === activeWorkspaceId || ws.isActive
									? 'border-kumo-accent bg-kumo-accent/10'
									: 'border-kumo-line bg-kumo-base'
							}`}
						>
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2">
									<p className="font-medium text-kumo-default truncate">
										{ws.name}
									</p>
									{(ws.id === activeWorkspaceId || ws.isActive) && (
										<CheckIcon
											size={14}
											weight="duotone"
											className="text-kumo-accent"
										/>
									)}
								</div>
								<p className="text-xs text-kumo-secondary truncate font-mono">
									{ws.path}
								</p>
								<div className="flex gap-2 mt-1">
									{ws.defaultProvider && (
										<span className="text-xs px-1.5 py-0.5 rounded bg-kumo-control text-kumo-secondary">
											{ws.defaultProvider}
										</span>
									)}
									{ws.defaultModel && (
										<span className="text-xs px-1.5 py-0.5 rounded bg-kumo-control text-kumo-secondary">
											{ws.defaultModel}
										</span>
									)}
								</div>
							</div>
							<div className="flex gap-1 ml-2">
								<button
									type="button"
									onClick={() =>
										onSelect(ws.id === activeWorkspaceId ? null : ws.id)
									}
									className="p-2 rounded hover:bg-kumo-hover text-kumo-secondary transition-colors"
									title={
										ws.id === activeWorkspaceId || ws.isActive
											? 'Deactivate'
											: 'Activate'
									}
								>
									<CheckIcon
										size={16}
										weight={
											ws.id === activeWorkspaceId || ws.isActive
												? 'fill'
												: 'duotone'
										}
									/>
								</button>
								<button
									type="button"
									onClick={() => onRemove(ws.id)}
									className="p-2 rounded hover:bg-kumo-hover text-kumo-danger transition-colors"
									title="Remove"
								>
									<TrashIcon size={16} />
								</button>
							</div>
						</div>
					))}
				</div>
			)}

			<p className="text-xs text-kumo-inactive">
				Workspaces are stored locally in your browser. Use the CLI to sync them
				across devices.
			</p>
		</div>
	)
}
