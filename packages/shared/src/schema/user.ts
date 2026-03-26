import {z} from 'zod'

export const userSchema = z.object({
	id: z.string().uuid(),
	email: z.string().email(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
})

export const authTokenSchema = z.object({
	token: z.string().min(32),
	userId: z.string().uuid(),
	expiresAt: z.string().datetime().optional(),
})

export const createUserSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8).optional(),
})

export type User = z.infer<typeof userSchema>
export type AuthToken = z.infer<typeof authTokenSchema>
export type CreateUser = z.infer<typeof createUserSchema>
