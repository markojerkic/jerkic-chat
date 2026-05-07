PRAGMA foreign_keys=OFF;--> statement-breakpoint
DELETE FROM `messagePart` WHERE `messageId` NOT IN (SELECT `id` FROM `message`);--> statement-breakpoint
DROP INDEX IF EXISTS `idx_message_part_created_at_asc`;--> statement-breakpoint
CREATE TABLE `__new_messagePart` (
	`id` text PRIMARY KEY NOT NULL,
	`messageId` text NOT NULL,
	`textContent` text,
	`type` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`messageId`) REFERENCES `message`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_messagePart`("id", "messageId", "textContent", "type", "createdAt") SELECT "id", "messageId", "textContent", "type", "createdAt" FROM `messagePart`;--> statement-breakpoint
DROP TABLE `messagePart`;--> statement-breakpoint
ALTER TABLE `__new_messagePart` RENAME TO `messagePart`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_message_part_created_at_asc` ON `messagePart` ("createdAt" asc);
