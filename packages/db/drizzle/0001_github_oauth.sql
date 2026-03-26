-- Add github_id column for OAuth login
ALTER TABLE `users` ADD COLUMN `github_id` text;
CREATE UNIQUE INDEX IF NOT EXISTS `users_github_id_idx` ON `users` (`github_id`);
