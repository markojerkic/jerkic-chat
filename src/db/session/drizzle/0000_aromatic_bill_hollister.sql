CREATE TABLE `message` (
	`id` text PRIMARY KEY NOT NULL,
	`textContent` text,
	`sender` text NOT NULL,
	`model` text NOT NULL,
	`createdAt` integer NOT NULL,
	`status` text NOT NULL,
	`messageAttachemts` text DEFAULT '[]'
);
--> statement-breakpoint
CREATE INDEX `idx_created_at_desc` ON `message` ("createdAt" desc);