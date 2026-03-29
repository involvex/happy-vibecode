import {createDb, authAccount, linkedRepos} from '@happy-vibecode/db'
import {eq, and} from 'drizzle-orm'
import {Octokit} from 'octokit'

interface GitHubTreeItem {
	path?: string
	mode?: string
	type?: string
	sha?: string
	size?: number
	url?: string
}

export interface GitHubEnv {
	DB: D1Database
	KV: KVNamespace
	AUTH_GITHUB_ID?: string
	AUTH_GITHUB_SECRET?: string
}

export class GitHubService {
	private db: ReturnType<typeof createDb>
	private kv: KVNamespace

	constructor(env: GitHubEnv) {
		this.db = createDb(env.DB)
		this.kv = env.KV
	}

	private async getAccessToken(userId: string): Promise<string> {
		const account = await this.db
			.select()
			.from(authAccount)
			.where(
				and(
					eq(authAccount.userId, userId),
					eq(authAccount.providerId, 'github'),
				),
			)
			.get()

		if (!account?.accessToken) {
			throw new Error(
				'No GitHub access token found. Please re-authenticate with GitHub.',
			)
		}

		if (
			account.accessTokenExpiresAt &&
			account.accessTokenExpiresAt < new Date()
		) {
			throw new Error(
				'GitHub access token expired. Please re-authenticate with GitHub.',
			)
		}

		return account.accessToken
	}

	private async getOctokit(userId: string): Promise<Octokit> {
		const token = await this.getAccessToken(userId)
		return new Octokit({auth: token})
	}

	async getUserRepos(
		userId: string,
		page = 1,
		perPage = 30,
	): Promise<
		Array<{
			id: number
			name: string
			fullName: string
			owner: string
			private: boolean
			defaultBranch: string
			description: string | null
		}>
	> {
		const octokit = await this.getOctokit(userId)
		const {data} = await octokit.rest.repos.listForAuthenticatedUser({
			per_page: perPage,
			page,
			sort: 'updated',
			direction: 'desc',
		})

		return data.map(repo => ({
			id: repo.id,
			name: repo.name,
			fullName: repo.full_name,
			owner: repo.owner.login,
			private: repo.private,
			defaultBranch: repo.default_branch,
			description: repo.description,
		}))
	}

	async getRepoTree(
		userId: string,
		owner: string,
		repo: string,
		ref?: string,
	): Promise<
		Array<{path: string; type: string; sha: string; size: number | null}>
	> {
		const cacheKey = `repo:tree:${owner}/${repo}:${ref ?? 'HEAD'}`
		const cached = await this.kv.get(cacheKey, 'json')
		if (cached) {
			return cached as Array<{
				path: string
				type: string
				sha: string
				size: number | null
			}>
		}

		const octokit = await this.getOctokit(userId)

		// Get the default branch if no ref provided
		let targetRef = ref
		if (!targetRef) {
			const {data: repoData} = await octokit.rest.repos.get({owner, repo})
			targetRef = repoData.default_branch
		}

		const {data} = await octokit.rest.git.getTree({
			owner,
			repo,
			tree_sha: targetRef,
			recursive: '1',
		})

		const tree = data.tree
			.filter(
				(item: GitHubTreeItem): item is GitHubTreeItem & {path: string} =>
					item.path !== undefined && item.type !== undefined,
			)
			.map((item: GitHubTreeItem & {path: string}) => ({
				path: item.path,
				type: item.type!,
				sha: item.sha!,
				size: item.size ?? null,
			}))
			.slice(0, 1000) // Truncate at 1000 entries

		await this.kv.put(cacheKey, JSON.stringify(tree), {expirationTtl: 3600}) // 1hr TTL

		return tree
	}

	async getFileContent(
		userId: string,
		owner: string,
		repo: string,
		path: string,
		ref?: string,
	): Promise<{content: string; encoding: string; sha: string}> {
		const pathHash = Buffer.from(path).toString('base64url')
		const cacheKey = `repo:file:${owner}/${repo}:${pathHash}`
		const cached = await this.kv.get(cacheKey, 'json')
		if (cached) {
			return cached as {content: string; encoding: string; sha: string}
		}

		const octokit = await this.getOctokit(userId)
		const params: {owner: string; repo: string; path: string; ref?: string} = {
			owner,
			repo,
			path,
		}
		if (ref) params.ref = ref

		const {data} = await octokit.rest.repos.getContent(params)

		if (Array.isArray(data) || data.type !== 'file') {
			throw new Error(`Path "${path}" is not a file`)
		}

		const result = {
			content: data.content,
			encoding: data.encoding,
			sha: data.sha,
		}

		await this.kv.put(cacheKey, JSON.stringify(result), {expirationTtl: 21600}) // 6hr TTL

		return result
	}

	async verifyRepoAccess(
		userId: string,
		owner: string,
		repo: string,
	): Promise<{
		id: number
		defaultBranch: string
		private: boolean
		fullName: string
	}> {
		const octokit = await this.getOctokit(userId)
		try {
			const {data} = await octokit.rest.repos.get({owner, repo})
			return {
				id: data.id,
				defaultBranch: data.default_branch,
				private: data.private,
				fullName: data.full_name,
			}
		} catch (err: unknown) {
			const status = (err as {status?: number}).status
			if (status === 404) {
				throw new Error(
					`Repository "${owner}/${repo}" not found or access denied. Ensure you have the "repo" scope.`,
				)
			}
			throw err
		}
	}

	async searchCode(
		userId: string,
		owner: string,
		repo: string,
		query: string,
	): Promise<
		Array<{path: string; line: number; text: string; htmlUrl: string}>
	> {
		const octokit = await this.getOctokit(userId)
		const {data} = await octokit.rest.search.code({
			q: `${query} repo:${owner}/${repo}`,
			per_page: 30,
		})

		return data.items.map(item => ({
			path: item.path,
			line: item.text_matches?.[0]?.fragment?.split('\n')?.length ?? 0,
			text: item.text_matches?.[0]?.fragment ?? '',
			htmlUrl: item.html_url,
		}))
	}

	async linkRepo(
		userId: string,
		owner: string,
		name: string,
	): Promise<{id: string; fullName: string}> {
		const repoInfo = await this.verifyRepoAccess(userId, owner, name)

		// Check if already linked
		const existing = await this.db
			.select()
			.from(linkedRepos)
			.where(
				and(
					eq(linkedRepos.userId, userId),
					eq(linkedRepos.githubRepoId, repoInfo.id),
				),
			)
			.get()

		if (existing) {
			return {id: existing.id, fullName: existing.fullName}
		}

		const id = crypto.randomUUID()
		const now = new Date()

		await this.db.insert(linkedRepos).values({
			id,
			userId,
			githubRepoId: repoInfo.id,
			owner,
			name,
			fullName: repoInfo.fullName,
			defaultBranch: repoInfo.defaultBranch,
			private: repoInfo.private,
			syncStatus: 'pending',
			createdAt: now,
			updatedAt: now,
		})

		return {id, fullName: repoInfo.fullName}
	}

	async unlinkRepo(userId: string, repoId: string): Promise<void> {
		const repo = await this.db
			.select()
			.from(linkedRepos)
			.where(and(eq(linkedRepos.id, repoId), eq(linkedRepos.userId, userId)))
			.get()

		if (!repo) {
			throw new Error('Linked repository not found')
		}

		await this.db.delete(linkedRepos).where(eq(linkedRepos.id, repoId))
	}

	async getLinkedRepos(userId: string) {
		return this.db
			.select()
			.from(linkedRepos)
			.where(eq(linkedRepos.userId, userId))
			.all()
	}

	async getLinkedRepo(userId: string, repoId: string) {
		const repo = await this.db
			.select()
			.from(linkedRepos)
			.where(and(eq(linkedRepos.id, repoId), eq(linkedRepos.userId, userId)))
			.get()

		if (!repo) {
			throw new Error('Linked repository not found')
		}

		return repo
	}

	invalidateTreeCache(owner: string, repo: string, ref?: string) {
		const cacheKey = `repo:tree:${owner}/${repo}:${ref ?? 'HEAD'}`
		return this.kv.delete(cacheKey)
	}
}
