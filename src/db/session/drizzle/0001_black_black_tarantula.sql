DROP INDEX `idx_created_at_desc`;--> statement-breakpoint
ALTER TABLE `message` ADD `order` integer;--> statement-breakpoint
CREATE INDEX `idx_created_at_desc` ON `message` ("createdAt" asc,"order" asc);