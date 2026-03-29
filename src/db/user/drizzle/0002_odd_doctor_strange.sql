PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_thread` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_thread`("id", "title", "createdAt", "updatedAt") SELECT "id", "title", "createdAt", "updatedAt" FROM `thread`;--> statement-breakpoint
DROP TABLE `thread`;--> statement-breakpoint
ALTER TABLE `__new_thread` RENAME TO `thread`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_created_at_desc` ON `thread` (`"updatedAt" desc`);