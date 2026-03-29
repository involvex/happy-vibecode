import {sqliteTable, text, integer} from 'drizzle-orm/sqlite-core'
import {sql} from 'drizzle-orm'

export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	email: text('email').unique(),
	passwordHash: text('password_hash'),
	apiToken: text('api_token').unique(),
	githubId: text('github_id').unique(),
	nickname: text('nickname'),
	preferences: text('preferences'),
	role: text('role').notNull().default('user'),
	status: text('status', {enum: ['active', 'suspended', 'pending']})
		.notNull()
		.default('active'),
	planTier: text('plan_tier', {enum: ['free', 'pro']})
		.notNull()
		.default('free'),
	subscriptionStatus: text('subscription_status', {
		enum: ['inactive', 'trialing', 'active', 'past_due', 'canceled', 'unpaid'],
	})
		.notNull()
		.default('inactive'),
	stripeCustomerId: text('stripe_customer_id').unique(),
	stripeSubscriptionId: text('stripe_subscription_id').unique(),
	stripePriceId: text('stripe_price_id'),
	subscriptionCurrentPeriodEnd: integer('subscription_current_period_end', {
		mode: 'timestamp_ms',
	}),
	subscriptionCancelAtPeriodEnd: integer('subscription_cancel_at_period_end', {
		mode: 'boolean',
	})
		.notNull()
		.default(false),
	subscriptionUpdatedAt: integer('subscription_updated_at', {
		mode: 'timestamp_ms',
	}),
	lastLogin: integer('last_login', {mode: 'timestamp_ms'}),
	createdAt: integer('created_at', {mode: 'timestamp_ms'}).notNull(),
	updatedAt: integer('updated_at', {mode: 'timestamp_ms'}).notNull(),
})

export const workspaces = sqliteTable('workspaces', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id),
	name: text('name').notNull(),
	path: text('path').notNull(),
	defaultProvider: text('default_provider'),
	defaultModel: text('default_model'),
	isActive: integer('is_active', {mode: 'boolean'}).default(false),
	createdAt: integer('created_at', {mode: 'timestamp_ms'}).default(
		sql`CURRENT_TIMESTAMP`,
	),
	updatedAt: integer('updated_at', {mode: 'timestamp_ms'}).default(
		sql`CURRENT_TIMESTAMP`,
	),
})

export const agentSessions = sqliteTable('agent_sessions', {
	id: text('id').primaryKey(), // UUID
	userId: text('user_id')
		.notNull()
		.references(() => users.id),
	agentType: text('agent_type').notNull(),
	connectionStatus: text('connection_status', {
		enum: ['connecting', 'connected', 'disconnected', 'error'],
	})
		.notNull()
		.default('connecting'),
	roomId: text('room_id').notNull(),
	workspaceId: text('workspace_id').references(() => workspaces.id),
	model: text('model'),
	startedAt: integer('started_at', {mode: 'timestamp_ms'}).notNull(),
	endedAt: integer('ended_at', {mode: 'timestamp_ms'}),
	metadata: text('metadata'), // JSON string
})

export const messageLogs = sqliteTable('message_logs', {
	id: text('id').primaryKey(), // UUID
	sessionId: text('session_id')
		.notNull()
		.references(() => agentSessions.id),
	role: text('role', {enum: ['user', 'assistant', 'system', 'tool']}).notNull(),
	content: text('content').notNull(),
	timestamp: integer('timestamp', {mode: 'timestamp_ms'}).notNull(),
	metadata: text('metadata'), // JSON string
})

export const deviceTokens = sqliteTable('device_tokens', {
	id: text('id').primaryKey(), // UUID
	userId: text('user_id')
		.notNull()
		.references(() => users.id),
	token: text('token').notNull(),
	platform: text('platform', {enum: ['ios', 'android', 'web']}).notNull(),
	createdAt: integer('created_at', {mode: 'timestamp_ms'}).notNull(),
	updatedAt: integer('updated_at', {mode: 'timestamp_ms'}).notNull(),
})

export const tickets = sqliteTable('tickets', {
	id: text('id').primaryKey(), // UUID
	userId: text('user_id')
		.notNull()
		.references(() => users.id),
	title: text('title').notNull(),
	topic: text('topic', {
		enum: ['bug', 'feature', 'billing', 'general', 'other'],
	}).notNull(),
	status: text('status', {
		enum: ['open', 'closed'],
	})
		.notNull()
		.default('open'),
	createdAt: integer('created_at', {mode: 'timestamp_ms'}).notNull(),
	updatedAt: integer('updated_at', {mode: 'timestamp_ms'}).notNull(),
})

export const ticketResponses = sqliteTable('ticket_responses', {
	id: text('id').primaryKey(), // UUID
	ticketId: text('ticket_id')
		.notNull()
		.references(() => tickets.id),
	userId: text('user_id')
		.notNull()
		.references(() => users.id),
	message: text('message').notNull(),
	createdAt: integer('created_at', {mode: 'timestamp_ms'}).notNull(),
})

export const roles = sqliteTable('roles', {
	id: text('id').primaryKey(),
	name: text('name').notNull().unique(),
	description: text('description'),
	permissions: text('permissions').notNull(), // JSON: { users: 'read|write', sessions: 'read', ... }
	createdAt: integer('created_at', {mode: 'timestamp_ms'}).notNull(),
	updatedAt: integer('updated_at', {mode: 'timestamp_ms'}).notNull(),
})

export const auditLogs = sqliteTable('audit_logs', {
	id: text('id').primaryKey(),
	actorId: text('actor_id')
		.notNull()
		.references(() => users.id),
	actorName: text('actor_name'),
	targetId: text('target_id'),
	targetName: text('target_name'),
	action: text('action').notNull(),
	details: text('details'), // JSON
	createdAt: integer('created_at', {mode: 'timestamp_ms'}).notNull(),
})

export const agents = sqliteTable('agents', {
	id: text('id').primaryKey(), // UUID
	name: text('name').notNull(),
	command: text('command').notNull(),
	args: text('args').notNull(), // JSON array
	promptFlag: text('prompt_flag'),
	modelFlag: text('model_flag'),
	description: text('description'),
	isActive: integer('is_active', {mode: 'boolean'}).default(true),
	createdAt: integer('created_at', {mode: 'timestamp_ms'}).notNull(),
	updatedAt: integer('updated_at', {mode: 'timestamp_ms'}).notNull(),
})

// Better Auth tables — prefixed with auth_ to avoid collision with existing users table
export const authUser = sqliteTable('auth_user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: integer('email_verified', {mode: 'boolean'})
		.notNull()
		.default(false),
	image: text('image'),
	createdAt: integer('created_at', {mode: 'timestamp_ms'}).notNull(),
	updatedAt: integer('updated_at', {mode: 'timestamp_ms'}).notNull(),
	role: text('role').notNull().default('user'),
	apiToken: text('api_token').unique(),
})

export const authSession = sqliteTable('auth_session', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => authUser.id, {onDelete: 'cascade'}),
	token: text('token').notNull().unique(),
	expiresAt: integer('expires_at', {mode: 'timestamp_ms'}).notNull(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	createdAt: integer('created_at', {mode: 'timestamp_ms'}).notNull(),
	updatedAt: integer('updated_at', {mode: 'timestamp_ms'}).notNull(),
})

export const authAccount = sqliteTable('auth_account', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => authUser.id, {onDelete: 'cascade'}),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	idToken: text('id_token'),
	accessTokenExpiresAt: integer('access_token_expires_at', {
		mode: 'timestamp_ms',
	}),
	refreshTokenExpiresAt: integer('refresh_token_expires_at', {
		mode: 'timestamp_ms',
	}),
	scope: text('scope'),
	password: text('password'),
	createdAt: integer('created_at', {mode: 'timestamp_ms'}).notNull(),
	updatedAt: integer('updated_at', {mode: 'timestamp_ms'}).notNull(),
})

export const authVerification = sqliteTable('auth_verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: integer('expires_at', {mode: 'timestamp_ms'}).notNull(),
	createdAt: integer('created_at', {mode: 'timestamp_ms'}),
	updatedAt: integer('updated_at', {mode: 'timestamp_ms'}),
})

export const agentTemplates = sqliteTable('agent_templates', {
	id: text('id').primaryKey(), // UUID
	userId: text('user_id')
		.notNull()
		.references(() => users.id),
	name: text('name').notNull(),
	description: text('description'),
	tags: text('tags').notNull().default('[]'), // JSON array
	isPublic: integer('is_public', {mode: 'boolean'}).notNull().default(false),
	latestVersionId: text('latest_version_id'),
	createdAt: integer('created_at', {mode: 'timestamp_ms'}).notNull(),
	updatedAt: integer('updated_at', {mode: 'timestamp_ms'}).notNull(),
})

export const agentTemplateVersions = sqliteTable('agent_template_versions', {
	id: text('id').primaryKey(), // UUID
	templateId: text('template_id')
		.notNull()
		.references(() => agentTemplates.id, {onDelete: 'cascade'}),
	version: integer('version').notNull(),
	promptTemplate: text('prompt_template').notNull(),
	defaultModel: text('default_model'),
	defaultProvider: text('default_provider'),
	tools: text('tools').notNull().default('[]'), // JSON array
	parameters: text('parameters').notNull().default('{}'), // JSON object
	changeNotes: text('change_notes'),
	createdAt: integer('created_at', {mode: 'timestamp_ms'}).notNull(),
})

export const notificationPreferences = sqliteTable('notification_preferences', {
	id: text('id').primaryKey(), // UUID
	userId: text('user_id')
		.notNull()
		.references(() => users.id)
		.unique(),
	agentCompleted: integer('agent_completed', {mode: 'boolean'})
		.notNull()
		.default(true),
	agentError: integer('agent_error', {mode: 'boolean'}).notNull().default(true),
	agentRequiresInput: integer('agent_requires_input', {mode: 'boolean'})
		.notNull()
		.default(true),
	quietHoursStart: integer('quiet_hours_start'),
	quietHoursEnd: integer('quiet_hours_end'),
	createdAt: integer('created_at', {mode: 'timestamp_ms'}).notNull(),
	updatedAt: integer('updated_at', {mode: 'timestamp_ms'}).notNull(),
})

export const offlineSyncQueue = sqliteTable('offline_sync_queue', {
	id: text('id').primaryKey(), // UUID
	userId: text('user_id')
		.notNull()
		.references(() => users.id),
	action: text('action', {
		enum: ['prompt', 'update_preferences', 'toggle_template_public'],
	}).notNull(),
	payload: text('payload').notNull(), // JSON object
	status: text('status', {
		enum: ['pending', 'processing', 'completed', 'failed'],
	})
		.notNull()
		.default('pending'),
	createdAt: integer('created_at', {mode: 'timestamp_ms'}).notNull(),
	processedAt: integer('processed_at', {mode: 'timestamp_ms'}),
	error: text('error'),
})
