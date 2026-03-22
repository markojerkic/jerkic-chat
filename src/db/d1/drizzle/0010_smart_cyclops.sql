PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_message` (
	`id` text PRIMARY KEY NOT NULL,
	`textContent` text,
	`sender` text NOT NULL,
	`model` text NOT NULL,
	`thread` text NOT NULL,
	FOREIGN KEY (`thread`) REFERENCES `thread`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_message`("id", "textContent", "sender", "model", "thread") SELECT "id", "textContent", "sender", "model", "thread" FROM `message`;--> statement-breakpoint
DROP TABLE `message`;--> statement-breakpoint
ALTER TABLE `__new_message` RENAME TO `message`;--> statement-breakpoint
PRAGMA foreign_keys=ON;