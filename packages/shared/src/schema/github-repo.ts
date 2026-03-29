import {z} from 'zod'

export const linkedRepoSchema = z.object({
	id: z.string(),
	userId: z.string(),
	githubRepoId: z.number(),
	owner: z.string(),
	name: z.string(),
	fullName: z.string(),
	defaultBranch: z.string(),
	private: z.boolean(),
	lastSyncedAt: z.date().nullable(),
	syncStatus: z.enum(['pending', 'syncing', 'synced', 'error']),
	syncError: z.string().nullable(),
	webhookId: z.number().nullable(),
	createdAt: z.date(),
	updatedAt: z.date(),
})

export const createLinkedRepoSchema = z.object({
	owner: z.string().min(1),
	name: z.string().min(1),
})

export const repoFileSchema = z.object({
	id: z.string(),
	repoId: z.string(),
	path: z.string(),
	sha: z.string(),
	size: z.number(),
	language: z.string().nullable(),
	summary: z.string().nullable(),
	lastIndexedAt: z.date(),
})

export type LinkedRepo = z.infer<typeof linkedRepoSchema>
export type CreateLinkedRepo = z.infer<typeof createLinkedRepoSchema>
export type RepoFile = z.infer<typeof repoFileSchema>
