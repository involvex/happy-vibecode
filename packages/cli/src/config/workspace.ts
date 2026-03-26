import type {WorkspaceConfig, AgentsConfig} from '../types/llm-provider.js'
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'fs'
import {homedir} from 'os'
import {join} from 'path'

const HAPPY_DIR = join(homedir(), '.happy')
const AGENTS_FILE = join(HAPPY_DIR, 'agents.json')

function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

function ensureDir(): void {
	if (!existsSync(HAPPY_DIR)) {
		mkdirSync(HAPPY_DIR, {recursive: true})
	}
}

function loadConfig(): AgentsConfig {
	ensureDir()
	if (!existsSync(AGENTS_FILE)) {
		return {agents: [], workspaces: []}
	}
	try {
		const cfg = JSON.parse(readFileSync(AGENTS_FILE, 'utf8')) as AgentsConfig
		return cfg
	} catch {
		return {agents: [], workspaces: []}
	}
}

function saveConfig(config: AgentsConfig): void {
	ensureDir()
	writeFileSync(AGENTS_FILE, JSON.stringify(config, null, 2))
}

export function loadWorkspaces(): WorkspaceConfig[] {
	const config = loadConfig()
	return config.workspaces ?? []
}

export function saveWorkspaces(workspaces: WorkspaceConfig[]): void {
	const config = loadConfig()
	config.workspaces = workspaces
	saveConfig(config)
}

export function addWorkspace(
	workspace: Omit<WorkspaceConfig, 'id'>,
): WorkspaceConfig {
	const workspaces = loadWorkspaces()
	const newWorkspace: WorkspaceConfig = {
		name: workspace.name,
		path: workspace.path,
		id: generateId(),
		defaultProvider: workspace.defaultProvider,
		defaultModel: workspace.defaultModel,
		isActive: false,
	}
	workspaces.push(newWorkspace)
	saveWorkspaces(workspaces)
	return newWorkspace
}

export function removeWorkspace(id: string): boolean {
	const workspaces = loadWorkspaces()
	const index = workspaces.findIndex(w => w.id === id)
	if (index === -1) return false
	workspaces.splice(index, 1)
	saveWorkspaces(workspaces)
	return true
}

export function updateWorkspace(
	id: string,
	updates: Partial<Omit<WorkspaceConfig, 'id'>>,
): WorkspaceConfig | null {
	const workspaces = loadWorkspaces()
	const index = workspaces.findIndex(w => w.id === id)
	if (index === -1) return null

	const existing = workspaces[index]
	if (!existing) return null

	const updated: WorkspaceConfig = {
		id: existing.id,
		name: updates.name ?? existing.name,
		path: updates.path ?? existing.path,
		defaultProvider: updates.defaultProvider ?? existing.defaultProvider,
		defaultModel: updates.defaultModel ?? existing.defaultModel,
		isActive: updates.isActive ?? existing.isActive,
	}

	workspaces[index] = updated
	saveWorkspaces(workspaces)
	return updated
}

export function getWorkspace(id: string): WorkspaceConfig | undefined {
	return loadWorkspaces().find(w => w.id === id)
}

export function listWorkspaces(): WorkspaceConfig[] {
	return loadWorkspaces()
}

export function getActiveWorkspace(): WorkspaceConfig | null {
	const workspaces = loadWorkspaces()
	const active = workspaces.find(w => w.isActive)
	if (active) return active
	return workspaces[0] ?? null
}

export function setActiveWorkspace(id: string): boolean {
	const workspaces = loadWorkspaces()
	const workspace = workspaces.find(w => w.id === id)
	if (!workspace) return false

	const updatedWorkspaces = workspaces.map(w => ({
		...w,
		isActive: w.id === id,
	}))
	saveWorkspaces(updatedWorkspaces)
	return true
}
