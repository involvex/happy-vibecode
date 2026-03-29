import {authMiddleware, type ApiEnv} from '../middleware/auth.js'
import {createDb, authAccount, users} from '@happy-vibecode/db'
import {createLinkedRepoSchema} from '@happy-vibecode/shared'
import {RepoIndexer} from '../services/repo-indexer.js'
import {GitHubService} from '../services/github.js'
import {eq, and} from 'drizzle-orm'
import {Hono} from 'hono'

export const reposRouter = new Hono<{
	Bindings: ApiEnv
	Variables: {userId: string; userRole: string}
}>()

reposRouter.use('*', authMiddleware)

reposRouter.get('/', async c => {
	const userId = c.get('userId')
	const github = new GitHubService(c.env)

	try {
		const repos = await github.getLinkedRepos(userId)
		return c.json({repos})
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to list repos'
		return c.json({error: message}, 500)
	}
})

reposRouter.post('/', async c => {
	const userId = c.get('userId')
	const body = await c.req.json()
	const parsed = createLinkedRepoSchema.safeParse(body)

	if (!parsed.success) {
		return c.json({error: 'Invalid request', details: parsed.error.issues}, 400)
	}

	const {owner, name} = parsed.data
	const github = new GitHubService(c.env)

	try {
		const result = await github.linkRepo(userId, owner, name)
		return c.json(result, 201)
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to link repo'
		const status = message.includes('not found') ? 404 : 500
		return c.json({error: message}, status)
	}
})

reposRouter.get('/available', async c => {
	const userId = c.get('userId')
	const page = Number(c.req.query('page') ?? '1')
	const perPage = Number(c.req.query('per_page') ?? '30')
	const github = new GitHubService(c.env)

	try {
		const repos = await github.getUserRepos(userId, page, perPage)
		return c.json({repos, page, perPage})
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to fetch repos'
		return c.json({error: message}, 500)
	}
})

reposRouter.delete('/:id', async c => {
	const userId = c.get('userId')
	const repoId = c.req.param('id')
	const github = new GitHubService(c.env)

	try {
		await github.unlinkRepo(userId, repoId)
		return c.json({success: true})
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to unlink repo'
		const status = message.includes('not found') ? 404 : 500
		return c.json({error: message}, status)
	}
})

reposRouter.get('/:id', async c => {
	const userId = c.get('userId')
	const repoId = c.req.param('id')
	const github = new GitHubService(c.env)

	try {
		const repo = await github.getLinkedRepo(userId, repoId)
		return c.json(repo)
	} catch (err) {
		const message =
			err instanceof Error ? err.message : 'Failed to get repo details'
		const status = message.includes('not found') ? 404 : 500
		return c.json({error: message}, status)
	}
})

reposRouter.post('/:id/sync', async c => {
	const userId = c.get('userId')
	const repoId = c.req.param('id')
	const indexer = new RepoIndexer(c.env)

	try {
		const result = await indexer.syncRepo(userId, repoId)
		return c.json(result)
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Sync failed'
		const status = message.includes('not found') ? 404 : 500
		return c.json({error: message}, status)
	}
})

reposRouter.post('/:id/index', async c => {
	const userId = c.get('userId')
	const repoId = c.req.param('id')
	const indexer = new RepoIndexer(c.env)

	try {
		const result = await indexer.indexRepo(userId, repoId)
		return c.json(result)
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Indexing failed'
		const status = message.includes('not found') ? 404 : 500
		return c.json({error: message}, status)
	}
})

reposRouter.get('/:id/tree', async c => {
	const userId = c.get('userId')
	const repoId = c.req.param('id')
	const ref = c.req.query('ref')
	const github = new GitHubService(c.env)

	try {
		const repo = await github.getLinkedRepo(userId, repoId)
		const tree = await github.getRepoTree(
			userId,
			repo.owner,
			repo.name,
			ref ?? repo.defaultBranch,
		)
		return c.json({tree, repo: repo.fullName})
	} catch (err) {
		const message =
			err instanceof Error ? err.message : 'Failed to get repo tree'
		const status = message.includes('not found') ? 404 : 500
		return c.json({error: message}, status)
	}
})

reposRouter.get('/:id/files', async c => {
	const userId = c.get('userId')
	const repoId = c.req.param('id')
	const path = c.req.query('path')
	const ref = c.req.query('ref')
	const github = new GitHubService(c.env)

	if (!path) {
		return c.json({error: 'Missing "path" query parameter'}, 400)
	}

	try {
		const repo = await github.getLinkedRepo(userId, repoId)
		const file = await github.getFileContent(
			userId,
			repo.owner,
			repo.name,
			path,
			ref,
		)

		const content =
			file.encoding === 'base64'
				? atob(file.content.replace(/\n/g, ''))
				: file.content

		return c.json({content, sha: file.sha, path})
	} catch (err) {
		const message =
			err instanceof Error ? err.message : 'Failed to get file content'
		const status = message.includes('not found') ? 404 : 500
		return c.json({error: message}, status)
	}
})

reposRouter.get('/:id/search', async c => {
	const userId = c.get('userId')
	const repoId = c.req.param('id')
	const query = c.req.query('q')
	const github = new GitHubService(c.env)

	if (!query) {
		return c.json({error: 'Missing "q" query parameter'}, 400)
	}

	try {
		const repo = await github.getLinkedRepo(userId, repoId)
		const results = await github.searchCode(
			userId,
			repo.owner,
			repo.name,
			query,
		)
		return c.json({results})
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Search failed'
		const status = message.includes('not found') ? 404 : 500
		return c.json({error: message}, status)
	}
})

reposRouter.post('/auth/pat', async c => {
	const userId = c.get('userId')
	const body = await c.req.json()
	const token = (body as {token?: string}).token

	if (!token || typeof token !== 'string') {
		return c.json({error: 'Missing GitHub personal access token'}, 400)
	}

	const db = createDb(c.env.DB)

	try {
		// Verify the token works by fetching user info
		const response = await fetch('https://api.github.com/user', {
			headers: {
				Authorization: `token ${token}`,
				'User-Agent': 'happy-vibecode',
			},
		})

		if (!response.ok) {
			return c.json({error: 'Invalid GitHub token'}, 401)
		}

		// Get the auth user id - resolve from users table
		const user = await db.query.users.findFirst({
			where: (u, {eq}) => eq(u.id, userId),
		})

		if (!user?.email) {
			return c.json({error: 'User not found'}, 404)
		}

		// Check if there's already a github-pat account
		const existing = await db
			.select()
			.from(authAccount)
			.where(
				and(
					eq(authAccount.userId, userId),
					eq(authAccount.providerId, 'github-pat'),
				),
			)
			.get()

		const now = new Date()

		if (existing) {
			await db
				.update(authAccount)
				.set({
					accessToken: token,
					updatedAt: now,
				})
				.where(eq(authAccount.id, existing.id))
		} else {
			await db.insert(authAccount).values({
				id: crypto.randomUUID(),
				userId,
				accountId: userId,
				providerId: 'github-pat',
				accessToken: token,
				createdAt: now,
				updatedAt: now,
			})
		}

		return c.json({success: true})
	} catch (err) {
		const message =
			err instanceof Error ? err.message : 'Failed to store GitHub token'
		return c.json({error: message}, 500)
	}
})
