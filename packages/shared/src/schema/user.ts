import {z} from 'zod'

export const userPreferencesSchema = z.object({
	theme: z.enum(['light', 'dark', 'system']).default('system'),
	notifications: z.boolean().default(true),
	language: z.string().default('en'),
})

export const userSchema = z.object({
	id: z.string().uuid(),
	email: z.string().email().nullable(),
	nickname: z.string().nullable(),
	preferences: userPreferencesSchema.nullable(),
	githubId: z.string().nullable(),
	hasPassword: z.boolean(),
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

export const updateProfileSchema = z.object({
	nickname: z.string().min(1).max(50).optional(),
	preferences: userPreferencesSchema.optional(),
})

export const setPasswordSchema = z.object({
	password: z
		.string()
		.min(8, 'Password must be at least 8 characters')
		.max(100, 'Password must be less than 100 characters'),
})

export const changePasswordSchema = z.object({
	currentPassword: z.string().min(1, 'Current password is required'),
	newPassword: z
		.string()
		.min(8, 'Password must be at least 8 characters')
		.max(100, 'Password must be less than 100 characters'),
})

export const linkEmailSchema = z.object({
	email: z.string().email('Please enter a valid email address'),
})

export const loginWithPasswordSchema = z.object({
	email: z.string().email('Please enter a valid email address'),
	password: z.string().min(1, 'Password is required'),
})

export type UserPreferences = z.infer<typeof userPreferencesSchema>
export type User = z.infer<typeof userSchema>
export type AuthToken = z.infer<typeof authTokenSchema>
export type CreateUser = z.infer<typeof createUserSchema>
export type UpdateProfile = z.infer<typeof updateProfileSchema>
export type SetPassword = z.infer<typeof setPasswordSchema>
export type ChangePassword = z.infer<typeof changePasswordSchema>
export type LinkEmail = z.infer<typeof linkEmailSchema>
export type LoginWithPassword = z.infer<typeof loginWithPasswordSchema>
