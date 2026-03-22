CREATE TABLE `message` (
	`id` text PRIMARY KEY NOT NULL,
	`textContent` text,
	`sender` text NOT NULL,
	`model` text NOT NULL,
	`status` text NOT NULL,
	`messageAttachemts` text DEFAULT '[]'
);
