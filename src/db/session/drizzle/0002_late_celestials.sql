CREATE TABLE `messageSegment` (
	`id` text PRIMARY KEY NOT NULL,
	`messageId` text NOT NULL,
	`type` text NOT NULL,
	`content` text NOT NULL,
	`order` integer NOT NULL,
	FOREIGN KEY (`messageId`) REFERENCES `message`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_message_segment_message_order` ON `messageSegment` ("messageId" asc,"order" asc);