CREATE TABLE `user_whitelist` (
	`username` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_githubId_unique` ON `user` (`githubId`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_userName_unique` ON `user` (`userName`);