CREATE TABLE `responses` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`code` text NOT NULL,
	`class_group` text NOT NULL,
	`method` text NOT NULL,
	`payload` text NOT NULL,
	`attachments` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `responses_user_created` ON `responses` (`user_id`,`created_at`);