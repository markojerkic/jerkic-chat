CREATE TABLE `messagePart` (
	`id` text PRIMARY KEY NOT NULL,
	`messageId` text NOT NULL,
	`type` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`messageId`) REFERENCES `message`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_created_at_desc` ON `messagePart` ("createdAt" asc);