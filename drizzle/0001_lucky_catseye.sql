CREATE TABLE `message` (
	`id` text PRIMARY KEY NOT NULL,
	`textContent` text,
	`sender` text,
	`thread` text,
	FOREIGN KEY (`thread`) REFERENCES `thread`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `thread` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text
);
