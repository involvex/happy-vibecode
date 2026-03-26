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
