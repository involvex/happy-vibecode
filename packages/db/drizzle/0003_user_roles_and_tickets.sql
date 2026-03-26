-- Add role column to users table
ALTER TABLE `users` ADD COLUMN `role` text NOT NULL DEFAULT 'user';

-- Create tickets table
CREATE TABLE IF NOT EXISTS `tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL REFERENCES `users`(`id`),
	`title` text NOT NULL,
	`topic` text NOT NULL CHECK(`topic` IN ('bug','feature','billing','general','other')),
	`status` text NOT NULL DEFAULT 'open' CHECK(`status` IN ('open','closed')),
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);

-- Create ticket_responses table
CREATE TABLE IF NOT EXISTS `ticket_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`ticket_id` text NOT NULL REFERENCES `tickets`(`id`),
	`user_id` text NOT NULL REFERENCES `users`(`id`),
	`message` text NOT NULL,
	`created_at` integer NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS `tickets_user_id_idx` ON `tickets` (`user_id`);
CREATE INDEX IF NOT EXISTS `tickets_status_idx` ON `tickets` (`status`);
CREATE INDEX IF NOT EXISTS `ticket_responses_ticket_id_idx` ON `ticket_responses` (`ticket_id`);
