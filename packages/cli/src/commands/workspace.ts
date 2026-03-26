import {
	addWorkspace,
	listWorkspaces,
	removeWorkspace,
	setActiveWorkspace,
	updateWorkspace,
} from '../config/workspace.js'
import {loadWorkspaces} from '../config/workspace.js'
import {Command} from 'commander'
import {existsSync} from 'fs'

const workspaceCommand = new Command('workspace').description(
	'Manage workspace directories',
)

workspaceCommand
	.command('list')
	.description('List all configured workspaces')
	.action(() => {
		const workspaces = listWorkspaces()
		if (workspaces.length === 0) {
			console.log('No workspaces configured.')
			console.log('  Run: happy-vibecode workspace add <name> <path>')
			return
		}

		console.log('\nWorkspaces:')
		workspaces.forEach((ws, i) => {
			const active = ws.isActive ? ' (active)' : ''
			console.log(`  ${i + 1}. ${ws.name}${active}`)
			console.log(`     Path: ${ws.path}`)
			if (ws.defaultProvider) {
				console.log(`     Provider: ${ws.defaultProvider}`)
			}
			if (ws.defaultModel) {
				console.log(`     Model: ${ws.defaultModel}`)
			}
			console.log('')
		})
	})

workspaceCommand
	.command('add')
	.description('Add a new workspace')
	.argument('<name>', 'Workspace name')
	.argument('<path>', 'Workspace directory path')
	.option('-p, --provider <provider>', 'Default LLM provider')
	.option('-m, --model <model>', 'Default model')
	.action((name: string, path: string, opts) => {
		if (!existsSync(path)) {
			console.error(`✗ Error: Directory does not exist: ${path}`)
			process.exit(1)
		}

		console.log('Adding workspace...')
		const workspace = addWorkspace({
			name,
			path,
			defaultProvider: opts.provider,
			defaultModel: opts.model,
		})
		console.log(`✓ Added workspace "${name}"`)
		console.log(`  ID: ${workspace.id}`)
		console.log(`  Path: ${workspace.path}`)
	})

workspaceCommand
	.command('remove')
	.description('Remove a workspace')
	.argument('<id>', 'Workspace ID or name')
	.action((id: string) => {
		const workspaces = loadWorkspaces()
		const ws = workspaces.find(w => w.id === id || w.name === id)

		if (!ws) {
			console.error(`✗ Workspace not found: ${id}`)
			process.exit(1)
		}

		const removed = removeWorkspace(ws.id)
		if (removed) {
			console.log(`✓ Removed workspace "${ws.name}"`)
		} else {
			console.error('✗ Failed to remove workspace')
			process.exit(1)
		}
	})

workspaceCommand
	.command('set-default')
	.description('Set default provider/model for a workspace')
	.argument('<id>', 'Workspace ID or name')
	.option(
		'-p, --provider <provider>',
		'Default LLM provider (gemini, claude, codex, opencode-ai, copilot)',
	)
	.option('-m, --model <model>', 'Default model')
	.action((id: string, opts) => {
		const workspaces = loadWorkspaces()
		const ws = workspaces.find(w => w.id === id || w.name === id)

		if (!ws) {
			console.error(`✗ Workspace not found: ${id}`)
			process.exit(1)
		}

		const updated = updateWorkspace(ws.id, {
			defaultProvider: opts.provider,
			defaultModel: opts.model,
		})

		if (updated) {
			console.log(`✓ Updated workspace "${ws.name}"`)
			if (opts.provider) console.log(`  Provider: ${opts.provider}`)
			if (opts.model) console.log(`  Model: ${opts.model}`)
		} else {
			console.error('✗ Failed to update workspace')
			process.exit(1)
		}
	})

workspaceCommand
	.command('activate')
	.description('Set active workspace')
	.argument('<id>', 'Workspace ID or name')
	.action((id: string) => {
		const workspaces = loadWorkspaces()
		const ws = workspaces.find(w => w.id === id || w.name === id)

		if (!ws) {
			console.error(`✗ Workspace not found: ${id}`)
			process.exit(1)
		}

		const success = setActiveWorkspace(ws.id)
		if (success) {
			console.log(`✓ Activated workspace "${ws.name}"`)
		} else {
			console.error('✗ Failed to activate workspace')
			process.exit(1)
		}
	})

export {workspaceCommand}
