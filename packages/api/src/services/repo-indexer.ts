import {createDb, linkedRepos, repoFiles} from '@happy-vibecode/db'
import {GitHubService, type GitHubEnv} from './github.js'
import {eq, sql} from 'drizzle-orm'

export interface RepoIndexerEnv extends GitHubEnv {}

export class RepoIndexer {
	private db: ReturnType<typeof createDb>
	private github: GitHubService

	constructor(env: RepoIndexerEnv) {
		this.db = createDb(env.DB)
		this.github = new GitHubService(env)
	}

	async indexRepo(
		userId: string,
		repoId: string,
	): Promise<{filesIndexed: number}> {
		const repo = await this.github.getLinkedRepo(userId, repoId)

		await this.db
			.update(linkedRepos)
			.set({
				syncStatus: 'syncing',
				syncError: null,
				updatedAt: new Date(),
			})
			.where(eq(linkedRepos.id, repoId))

		try {
			const tree = await this.github.getRepoTree(
				userId,
				repo.owner,
				repo.name,
				repo.defaultBranch,
			)

			const files = tree.filter(item => item.type === 'blob')

			// Clear existing file index
			await this.db.delete(repoFiles).where(eq(repoFiles.repoId, repoId))

			// Insert file metadata in batches
			const batchSize = 50
			for (let i = 0; i < files.length; i += batchSize) {
				const batch = files.slice(i, i + batchSize)
				const now = new Date()

				await this.db
					.insert(repoFiles)
					.values(
						batch.map(file => ({
							id: crypto.randomUUID(),
							repoId,
							path: file.path,
							sha: file.sha,
							size: file.size ?? 0,
							language: detectLanguage(file.path),
							summary: null,
							lastIndexedAt: now,
						})),
					)
					.onConflictDoUpdate({
						target: [repoFiles.path, repoFiles.repoId],
						set: {
							sha: sql`excluded.sha`,
							size: sql`excluded.size`,
							lastIndexedAt: new Date(),
						},
					})
			}

			await this.db
				.update(linkedRepos)
				.set({
					syncStatus: 'synced',
					lastSyncedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(eq(linkedRepos.id, repoId))

			return {filesIndexed: files.length}
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error'
			await this.db
				.update(linkedRepos)
				.set({
					syncStatus: 'error',
					syncError: message,
					updatedAt: new Date(),
				})
				.where(eq(linkedRepos.id, repoId))

			throw err
		}
	}

	async syncRepo(
		userId: string,
		repoId: string,
	): Promise<{filesAdded: number; filesUpdated: number; filesRemoved: number}> {
		const repo = await this.github.getLinkedRepo(userId, repoId)

		await this.db
			.update(linkedRepos)
			.set({
				syncStatus: 'syncing',
				syncError: null,
				updatedAt: new Date(),
			})
			.where(eq(linkedRepos.id, repoId))

		try {
			const remoteTree = await this.github.getRepoTree(
				userId,
				repo.owner,
				repo.name,
				repo.defaultBranch,
			)
			const remoteFiles = remoteTree.filter(item => item.type === 'blob')

			const localFiles = await this.db
				.select()
				.from(repoFiles)
				.where(eq(repoFiles.repoId, repoId))
				.all()

			const localByPath = new Map(localFiles.map(f => [f.path, f]))
			const remoteByPath = new Map(remoteFiles.map(f => [f.path, f]))

			const now = new Date()
			let filesAdded = 0
			let filesUpdated = 0
			let filesRemoved = 0

			// Add or update files
			for (const remote of remoteFiles) {
				const local = localByPath.get(remote.path)
				if (!local) {
					await this.db.insert(repoFiles).values({
						id: crypto.randomUUID(),
						repoId,
						path: remote.path,
						sha: remote.sha,
						size: remote.size ?? 0,
						language: detectLanguage(remote.path),
						summary: null,
						lastIndexedAt: now,
					})
					filesAdded++
				} else if (local.sha !== remote.sha) {
					await this.db
						.update(repoFiles)
						.set({
							sha: remote.sha,
							size: remote.size ?? 0,
							language: detectLanguage(remote.path),
							lastIndexedAt: now,
						})
						.where(eq(repoFiles.id, local.id))
					filesUpdated++
				}
			}

			// Remove deleted files
			for (const local of localFiles) {
				if (!remoteByPath.has(local.path)) {
					await this.db.delete(repoFiles).where(eq(repoFiles.id, local.id))
					filesRemoved++
				}
			}

			await this.db
				.update(linkedRepos)
				.set({
					syncStatus: 'synced',
					lastSyncedAt: now,
					updatedAt: now,
				})
				.where(eq(linkedRepos.id, repoId))

			// Invalidate tree cache
			this.github.invalidateTreeCache(repo.owner, repo.name, repo.defaultBranch)

			return {filesAdded, filesUpdated, filesRemoved}
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error'
			await this.db
				.update(linkedRepos)
				.set({
					syncStatus: 'error',
					syncError: message,
					updatedAt: new Date(),
				})
				.where(eq(linkedRepos.id, repoId))

			throw err
		}
	}
}

function detectLanguage(path: string): string | null {
	const ext = path.split('.').pop()?.toLowerCase()
	const langMap: Record<string, string> = {
		ts: 'TypeScript',
		tsx: 'TypeScript',
		js: 'JavaScript',
		jsx: 'JavaScript',
		py: 'Python',
		rs: 'Rust',
		go: 'Go',
		java: 'Java',
		rb: 'Ruby',
		cs: 'C#',
		cpp: 'C++',
		c: 'C',
		h: 'C',
		hpp: 'C++',
		swift: 'Swift',
		kt: 'Kotlin',
		php: 'PHP',
		sh: 'Shell',
		bash: 'Shell',
		zsh: 'Shell',
		sql: 'SQL',
		yaml: 'YAML',
		yml: 'YAML',
		json: 'JSON',
		md: 'Markdown',
		html: 'HTML',
		css: 'CSS',
		scss: 'SCSS',
		toml: 'TOML',
	}
	return ext ? (langMap[ext] ?? null) : null
}
