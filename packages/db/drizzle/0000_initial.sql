-- Happy Vibecode D1 initial migration
CREATE TABLE IF NOT EXISTS `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL UNIQUE,
	`password_hash` text,
	`api_token` text UNIQUE,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);

CREATE TABLE IF NOT EXISTS `agent_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL REFERENCES `users`(`id`),
	`agent_type` text NOT NULL CHECK(`agent_type` IN ('claude','gemini','codex','opencode','custom')),
	`connection_status` text NOT NULL DEFAULT 'connecting' CHECK(`connection_status` IN ('connecting','connected','disconnected','error')),
	`room_id` text NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`metadata` text
);

CREATE TABLE IF NOT EXISTS `message_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL REFERENCES `agent_sessions`(`id`),
	`role` text NOT NULL CHECK(`role` IN ('user','assistant','system','tool')),
	`content` text NOT NULL,
	`timestamp` integer NOT NULL,
	`metadata` text
);

CREATE TABLE IF NOT EXISTS `device_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL REFERENCES `users`(`id`),
	`token` text NOT NULL,
	`platform` text NOT NULL CHECK(`platform` IN ('ios','android','web')),
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);

CREATE INDEX IF NOT EXISTS `agent_sessions_user_id_idx` ON `agent_sessions` (`user_id`);
CREATE INDEX IF NOT EXISTS `message_logs_session_id_idx` ON `message_logs` (`session_id`);
CREATE INDEX IF NOT EXISTS `device_tokens_user_id_idx` ON `device_tokens` (`user_id`);
