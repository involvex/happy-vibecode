import {z} from 'zod'

export const offlineActionTypeSchema = z.enum([
	'prompt',
	'update_preferences',
	'toggle_template_public',
])

export const offlineSyncStatusSchema = z.enum([
	'pending',
	'processing',
	'completed',
	'failed',
])

export const offlineSyncQueueItemSchema = z.object({
	id: z.string().uuid(),
	userId: z.string().uuid(),
	action: offlineActionTypeSchema,
	payload: z.record(z.string(), z.unknown()),
	status: offlineSyncStatusSchema.default('pending'),
	createdAt: z.string().datetime(),
	processedAt: z.string().datetime().nullable().optional(),
	error: z.string().nullable().optional(),
})

export const createOfflineSyncItemSchema = z.object({
	action: offlineActionTypeSchema,
	payload: z.record(z.string(), z.unknown()),
})

export const offlineSyncBatchSchema = z.object({
	items: z.array(createOfflineSyncItemSchema).min(1).max(50),
})

export const offlineSyncResultSchema = z.object({
	id: z.string().uuid(),
	status: z.enum(['completed', 'failed']),
	result: z.unknown().optional(),
	error: z.string().optional(),
})

export const offlineSyncBatchResultSchema = z.object({
	processed: z.number().int(),
	results: z.array(offlineSyncResultSchema),
})

export type OfflineActionType = z.infer<typeof offlineActionTypeSchema>
export type OfflineSyncStatus = z.infer<typeof offlineSyncStatusSchema>
export type OfflineSyncQueueItem = z.infer<typeof offlineSyncQueueItemSchema>
export type CreateOfflineSyncItem = z.infer<typeof createOfflineSyncItemSchema>
export type OfflineSyncBatch = z.infer<typeof offlineSyncBatchSchema>
export type OfflineSyncResult = z.infer<typeof offlineSyncResultSchema>
export type OfflineSyncBatchResult = z.infer<
	typeof offlineSyncBatchResultSchema
>
