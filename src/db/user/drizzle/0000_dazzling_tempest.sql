CREATE TABLE `thread` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_created_at_desc` ON `thread` ("updatedAt" desc);