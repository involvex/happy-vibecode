-- Add status and last_login columns to users table
ALTER TABLE `users` ADD COLUMN `status` text NOT NULL DEFAULT 'active' CHECK(`status` IN ('active','suspended','pending'));
ALTER TABLE `users` ADD COLUMN `last_login` integer;

-- Create roles table
CREATE TABLE IF NOT EXISTS `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL UNIQUE,
	`description` text,
	`permissions` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL REFERENCES `users`(`id`),
	`actor_name` text,
	`target_id` text,
	`target_name` text,
	`action` text NOT NULL,
	`details` text,
	`created_at` integer NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS `audit_logs_actor_id_idx` ON `audit_logs` (`actor_id`);
CREATE INDEX IF NOT EXISTS `audit_logs_action_idx` ON `audit_logs` (`action`);
CREATE INDEX IF NOT EXISTS `audit_logs_created_at_idx` ON `audit_logs` (`created_at`);

-- Seed default roles
INSERT INTO `roles` (`id`, `name`, `description`, `permissions`, `created_at`, `updated_at`)
VALUES
	('role_super_admin', 'Super Admin', 'Full access to all features', '{"users":"read|write|delete","roles":"read|write|delete","sessions":"read|write|delete","workspaces":"read|write|delete","tickets":"read|write|delete","analytics":"read|write","audit":"read"}', strftime('%s','now')*1000, strftime('%s','now')*1000),
	('role_admin', 'Admin', 'Manage users and content', '{"users":"read|write","roles":"read","sessions":"read|write","workspaces":"read|write","tickets":"read|write","analytics":"read","audit":"read"}', strftime('%s','now')*1000, strftime('%s','now')*1000),
	('role_editor', 'Editor', 'Create and edit content', '{"users":"read","roles":"read","sessions":"read|write","workspaces":"read|write","tickets":"read","analytics":"read"}', strftime('%s','now')*1000, strftime('%s','now')*1000),
	('role_viewer', 'Viewer', 'Read-only access', '{"users":"read","roles":"read","sessions":"read","workspaces":"read","tickets":"read","analytics":"read"}', strftime('%s','now')*1000, strftime('%s','now')*1000);
