-- Add nickname and preferences columns for user profile
ALTER TABLE `users` ADD COLUMN `nickname` text;
ALTER TABLE `users` ADD COLUMN `preferences` text;