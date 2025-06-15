CREATE INDEX `message_thread_idx` ON `message` (`thread`,`id`);--> statement-breakpoint
CREATE INDEX `thread_owner_idx` ON `thread` (`owner`,`id`);