import {sqliteTable, text, integer} from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
	id: text('id').primaryKey(), // UUID
	email: text('email').notNull().unique(),
	passwordHash: text('password_hash'),
	apiToken: text('api_token').unique(),
	githubId: text('github_id').unique(),
	createdAt: integer('created_at', {mode: 'timestamp_ms'}).notNull(),
	updatedAt: integer('updated_at', {mode: 'timestamp_ms'}).notNull(),
})

export const agentSessions = sqliteTable('agent_sessions', {
	id: text('id').primaryKey(), // UUID
	userId: text('user_id')
		.notNull()
		.references(() => users.id),
	agentType: text('agent_type', {
		enum: ['claude', 'gemini', 'codex', 'opencode', 'custom'],
	}).notNull(),
	connectionStatus: text('connection_status', {
		enum: ['connecting', 'connected', 'disconnected', 'error'],
	})
		.notNull()
		.default('connecting'),
	roomId: text('room_id').notNull(),
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
