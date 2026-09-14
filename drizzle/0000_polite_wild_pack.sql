CREATE TABLE `catalog_sync_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`status` enum('running','success','partial','failed') NOT NULL,
	`sourceCount` int NOT NULL DEFAULT 0,
	`environmentCount` int NOT NULL DEFAULT 0,
	`errorMessage` text,
	CONSTRAINT `catalog_sync_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `catalog_sync_settings` (
	`id` int NOT NULL,
	`scheduleCronTaskUid` varchar(65),
	`cronExpression` varchar(64) NOT NULL DEFAULT '0 0 6 * * *',
	`enabled` int NOT NULL DEFAULT 1,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `catalog_sync_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `practice_environments` (
	`id` varchar(160) NOT NULL,
	`sourceId` varchar(64) NOT NULL,
	`sourceName` varchar(128) NOT NULL,
	`title` varchar(255) NOT NULL,
	`url` varchar(768) NOT NULL,
	`category` varchar(128) NOT NULL,
	`difficulty` varchar(32) NOT NULL,
	`description` text NOT NULL,
	`discoveryMethod` varchar(32) NOT NULL,
	`skillsJson` text NOT NULL,
	`points` int NOT NULL DEFAULT 150,
	`firstSeenAt` timestamp NOT NULL DEFAULT (now()),
	`lastSyncedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `practice_environments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE INDEX `catalog_sync_runs_status_idx` ON `catalog_sync_runs` (`status`);--> statement-breakpoint
CREATE INDEX `catalog_sync_runs_started_idx` ON `catalog_sync_runs` (`startedAt`);--> statement-breakpoint
CREATE INDEX `practice_environments_source_idx` ON `practice_environments` (`sourceId`);--> statement-breakpoint
CREATE INDEX `practice_environments_sync_idx` ON `practice_environments` (`lastSyncedAt`);