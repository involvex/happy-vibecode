CREATE TABLE IF NOT EXISTS `linked_repos` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`github_repo_id` integer NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`full_name` text NOT NULL,
	`default_branch` text DEFAULT 'main' NOT NULL,
	`private` integer DEFAULT false NOT NULL,
	`last_synced_at` integer,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`sync_error` text,
	`webhook_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `repo_files` (
	`id` text PRIMARY KEY NOT NULL,
	`repo_id` text NOT NULL,
	`path` text NOT NULL,
	`sha` text NOT NULL,
	`size` integer NOT NULL,
	`language` text,
	`summary` text,
	`last_indexed_at` integer NOT NULL,
	FOREIGN KEY (`repo_id`) REFERENCES `linked_repos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `repo_embeddings` (
	`id` text PRIMARY KEY NOT NULL,
	`repo_id` text NOT NULL,
	`file_path` text NOT NULL,
	`chunk_index` integer NOT NULL,
	`content` text NOT NULL,
	`embedding` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`repo_id`) REFERENCES `linked_repos`(`id`) ON UPDATE no action ON DELETE cascade
);
