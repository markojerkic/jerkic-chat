PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_message` (
	`id` text PRIMARY KEY NOT NULL,
	`textContent` text,
	`sender` text NOT NULL,
	`model` text NOT NULL,
	`createdAt` integer NOT NULL,
	`status` text NOT NULL,
	`messageAttachemts` text DEFAULT '[]'
);
--> statement-breakpoint
INSERT INTO `__new_message`("id", "textContent", "sender", "model", "createdAt", "status", "messageAttachemts") SELECT "id", "textContent", "sender", "model", "createdAt", "status", "messageAttachemts" FROM `message`;--> statement-breakpoint
DROP TABLE `message`;--> statement-breakpoint
ALTER TABLE `__new_message` RENAME TO `message`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_created_at_desc` ON `message` (`"createdAt" desc`);