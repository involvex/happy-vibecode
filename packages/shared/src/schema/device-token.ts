import {z} from 'zod'

export const devicePlatformSchema = z.enum(['ios', 'android', 'web'])

export const deviceTokenSchema = z.object({
	id: z.string().uuid(),
	userId: z.string().uuid(),
	token: z.string(),
	platform: devicePlatformSchema,
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
})

export const createDeviceTokenSchema = z.object({
	userId: z.string().uuid(),
	token: z.string(),
	platform: devicePlatformSchema,
})

export type DevicePlatform = z.infer<typeof devicePlatformSchema>
export type DeviceToken = z.infer<typeof deviceTokenSchema>
export type CreateDeviceToken = z.infer<typeof createDeviceTokenSchema>
