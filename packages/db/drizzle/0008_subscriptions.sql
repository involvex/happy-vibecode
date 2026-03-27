ALTER TABLE `users` ADD `plan_tier` text NOT NULL DEFAULT 'free' CHECK(`plan_tier` IN ('free', 'pro'));
ALTER TABLE `users` ADD `subscription_status` text NOT NULL DEFAULT 'inactive' CHECK(`subscription_status` IN ('inactive', 'trialing', 'active', 'past_due', 'canceled', 'unpaid'));
ALTER TABLE `users` ADD `stripe_customer_id` text;
ALTER TABLE `users` ADD `stripe_subscription_id` text;
ALTER TABLE `users` ADD `stripe_price_id` text;
ALTER TABLE `users` ADD `subscription_current_period_end` integer;
ALTER TABLE `users` ADD `subscription_cancel_at_period_end` integer NOT NULL DEFAULT 0;
ALTER TABLE `users` ADD `subscription_updated_at` integer;

CREATE UNIQUE INDEX `users_stripe_customer_id_unique` ON `users` (`stripe_customer_id`);
CREATE UNIQUE INDEX `users_stripe_subscription_id_unique` ON `users` (`stripe_subscription_id`);
