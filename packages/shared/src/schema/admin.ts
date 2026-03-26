import {z} from 'zod'

// --- User Management ---
export const userStatusSchema = z.enum(['active', 'suspended', 'pending'])

export const adminUserSchema = z.object({
	id: z.string(),
	email: z.string().nullable(),
	nickname: z.string().nullable(),
	githubId: z.string().nullable(),
	role: z.string(),
	status: userStatusSchema,
	lastLogin: z.string().nullable(),
	createdAt: z.string(),
	updatedAt: z.string(),
})

export const adminUserListSchema = z.object({
	users: z.array(adminUserSchema),
	total: z.number(),
	page: z.number(),
	pageSize: z.number(),
})

export const createUserAdminSchema = z.object({
	email: z.string().email('Valid email required'),
	password: z.string().min(8).optional(),
	nickname: z.string().max(50).optional(),
	role: z.string().default('user'),
	status: userStatusSchema.default('active'),
})

export const updateUserAdminSchema = z.object({
	email: z.string().email().optional(),
	nickname: z.string().max(50).optional().nullable(),
	role: z.string().optional(),
})

export const updateUserStatusSchema = z.object({
	status: userStatusSchema,
})

export const userSettingsOverrideSchema = z.object({
	theme: z.enum(['light', 'dark', 'system']).optional(),
	notifications: z.boolean().optional(),
	language: z.string().optional(),
	timezone: z.string().optional(),
	apiAccess: z.boolean().optional(),
	featureFlags: z.record(z.string(), z.boolean()).optional(),
	storageQuotaMb: z.number().min(0).optional(),
})

// --- Role Management ---
export const permissionModules = [
	'users',
	'roles',
	'sessions',
	'workspaces',
	'tickets',
	'analytics',
	'audit',
] as const

export const permissionActions = ['read', 'write', 'delete'] as const

export const permissionsSchema = z.record(z.string(), z.string())

export const roleSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	permissions: permissionsSchema,
	createdAt: z.string(),
	updatedAt: z.string(),
	userCount: z.number().optional(),
})

export const createRoleSchema = z.object({
	name: z.string().min(1, 'Name is required').max(50),
	description: z.string().max(200).optional(),
	permissions: permissionsSchema,
})

export const updateRoleSchema = z.object({
	name: z.string().min(1).max(50).optional(),
	description: z.string().max(200).optional().nullable(),
	permissions: permissionsSchema.optional(),
})

export const bulkAssignRoleSchema = z.object({
	roleName: z.string().min(1),
	userIds: z.array(z.string()).min(1, 'Select at least one user'),
})

// --- Analytics ---
export const dateRangeSchema = z.object({
	startDate: z.string().optional(),
	endDate: z.string().optional(),
})

export const analyticsOverviewSchema = z.object({
	totalUsers: z.number(),
	activeUsers: z.object({
		dau: z.number(),
		wau: z.number(),
		mau: z.number(),
	}),
	newSignupsToday: z.number(),
	newSignupsWeek: z.number(),
	newSignupsMonth: z.number(),
	totalSessions: z.number(),
	activeSessions: z.number(),
})

export const signupTrendSchema = z.object({
	date: z.string(),
	count: z.number(),
})

export const roleDistributionSchema = z.object({
	role: z.string(),
	count: z.number(),
})

export const sessionMetricSchema = z.object({
	date: z.string(),
	count: z.number(),
	avgDurationMinutes: z.number(),
})

export const loginHeatmapSchema = z.object({
	dayOfWeek: z.number(),
	hour: z.number(),
	count: z.number(),
})

// --- Audit Log ---
export const auditLogSchema = z.object({
	id: z.string(),
	actorId: z.string(),
	actorName: z.string().nullable(),
	targetId: z.string().nullable(),
	targetName: z.string().nullable(),
	action: z.string(),
	details: z.string().nullable(),
	createdAt: z.string(),
})

export const auditLogListSchema = z.object({
	logs: z.array(auditLogSchema),
	total: z.number(),
	page: z.number(),
	pageSize: z.number(),
})

// --- Types ---
export type UserStatus = z.infer<typeof userStatusSchema>
export type AdminUser = z.infer<typeof adminUserSchema>
export type AdminUserList = z.infer<typeof adminUserListSchema>
export type CreateUserAdmin = z.infer<typeof createUserAdminSchema>
export type UpdateUserAdmin = z.infer<typeof updateUserAdminSchema>
export type UpdateUserStatus = z.infer<typeof updateUserStatusSchema>
export type UserSettingsOverride = z.infer<typeof userSettingsOverrideSchema>
export type Permissions = z.infer<typeof permissionsSchema>
export type Role = z.infer<typeof roleSchema>
export type CreateRole = z.infer<typeof createRoleSchema>
export type UpdateRole = z.infer<typeof updateRoleSchema>
export type BulkAssignRole = z.infer<typeof bulkAssignRoleSchema>
export type DateRange = z.infer<typeof dateRangeSchema>
export type AnalyticsOverview = z.infer<typeof analyticsOverviewSchema>
export type SignupTrend = z.infer<typeof signupTrendSchema>
export type RoleDistribution = z.infer<typeof roleDistributionSchema>
export type SessionMetric = z.infer<typeof sessionMetricSchema>
export type LoginHeatmap = z.infer<typeof loginHeatmapSchema>
export type AuditLog = z.infer<typeof auditLogSchema>
export type AuditLogList = z.infer<typeof auditLogListSchema>
