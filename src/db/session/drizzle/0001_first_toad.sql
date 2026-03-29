ALTER TABLE `message` ADD `createdAt` integer;--> statement-breakpoint
CREATE INDEX `idx_created_at_desc` ON `message` ("createdAt" desc);