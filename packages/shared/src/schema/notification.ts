import {z} from 'zod'

export const notificationPreferencesSchema = z.object({
	id: z.string().uuid(),
	userId: z.string().uuid(),
	agentCompleted: z.boolean().default(true),
	agentError: z.boolean().default(true),
	agentRequiresInput: z.boolean().default(true),
	quietHoursStart: z.number().int().min(0).max(23).nullable().optional(),
	quietHoursEnd: z.number().int().min(0).max(23).nullable().optional(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
})

export const updateNotificationPreferencesSchema = z.object({
	agentCompleted: z.boolean().optional(),
	agentError: z.boolean().optional(),
	agentRequiresInput: z.boolean().optional(),
	quietHoursStart: z.number().int().min(0).max(23).nullable().optional(),
	quietHoursEnd: z.number().int().min(0).max(23).nullable().optional(),
})

export const pushPayloadSchema = z.object({
	title: z.string(),
	body: z.string(),
	data: z.record(z.string(), z.string()).optional(),
	sound: z.string().default('default'),
	badge: z.number().int().optional(),
})

export type NotificationPreferences = z.infer<
	typeof notificationPreferencesSchema
>
export type UpdateNotificationPreferences = z.infer<
	typeof updateNotificationPreferencesSchema
>
export type PushPayload = z.infer<typeof pushPayloadSchema>
