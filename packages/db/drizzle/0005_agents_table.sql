-- Create agents table
CREATE TABLE IF NOT EXISTS `agents` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`command` text NOT NULL,
	`args` text NOT NULL,
	`prompt_flag` text,
	`model_flag` text,
	`description` text,
	`is_active` integer DEFAULT true,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);

-- Create workspaces table (was missing from prior migrations)
CREATE TABLE IF NOT EXISTS `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL REFERENCES `users`(`id`),
	`name` text NOT NULL,
	`path` text NOT NULL,
	`default_provider` text,
	`default_model` text,
	`is_active` integer DEFAULT false,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP
);

-- Remove CHECK constraint from agent_sessions.agent_type (from text with enum to plain text)
-- SQLite doesn't support ALTER COLUMN, so recreate the table
CREATE TABLE `agent_sessions_new` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL REFERENCES `users`(`id`),
	`agent_type` text NOT NULL,
	`connection_status` text NOT NULL DEFAULT 'connecting' CHECK(`connection_status` IN ('connecting','connected','disconnected','error')),
	`room_id` text NOT NULL,
	`workspace_id` text,
	`model` text,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`metadata` text
);

INSERT INTO `agent_sessions_new` (`id`, `user_id`, `agent_type`, `connection_status`, `room_id`, `started_at`, `ended_at`, `metadata`)
SELECT `id`, `user_id`, `agent_type`, `connection_status`, `room_id`, `started_at`, `ended_at`, `metadata`
FROM `agent_sessions`;

DROP TABLE `agent_sessions`;
ALTER TABLE `agent_sessions_new` RENAME TO `agent_sessions`;

CREATE INDEX IF NOT EXISTS `agent_sessions_user_id_idx` ON `agent_sessions` (`user_id`);
