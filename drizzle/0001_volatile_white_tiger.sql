CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`actorId` int NOT NULL,
	`entityType` varchar(40) NOT NULL,
	`entityId` int NOT NULL,
	`action` varchar(40) NOT NULL,
	`beforeValue` text,
	`afterValue` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`userId` int NOT NULL,
	`type` varchar(40) NOT NULL,
	`title` varchar(160) NOT NULL,
	`body` text NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recurringSchedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`memberId` int NOT NULL,
	`weekday` int NOT NULL,
	`startTime` varchar(5) NOT NULL,
	`endTime` varchar(5) NOT NULL,
	`breakMinutes` int NOT NULL DEFAULT 30,
	`effectiveFrom` varchar(10) NOT NULL,
	`effectiveTo` varchar(10),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recurringSchedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shiftSwaps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`shiftId` int NOT NULL,
	`requesterId` int NOT NULL,
	`targetMemberId` int NOT NULL,
	`status` enum('pending_target','pending_owner','approved','rejected','cancelled') NOT NULL DEFAULT 'pending_target',
	`reason` varchar(180),
	`targetConfirmedAt` timestamp,
	`ownerDecidedAt` timestamp,
	`ownerDecisionNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shiftSwaps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`shiftId` int NOT NULL,
	`memberId` int NOT NULL,
	`workDate` varchar(10) NOT NULL,
	`clockInAt` timestamp,
	`clockOutAt` timestamp,
	`breakMinutes` int NOT NULL DEFAULT 30,
	`note` text,
	`lockedAt` timestamp,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workShifts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`memberId` int NOT NULL,
	`workDate` varchar(10) NOT NULL,
	`startTime` varchar(5) NOT NULL,
	`endTime` varchar(5) NOT NULL,
	`breakMinutes` int NOT NULL DEFAULT 30,
	`status` enum('scheduled','holiday','swapped','cancelled') NOT NULL DEFAULT 'scheduled',
	`source` enum('recurring','manual','swap') NOT NULL DEFAULT 'recurring',
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workShifts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workspaceMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`userId` int NOT NULL,
	`memberRole` enum('owner','staff') NOT NULL DEFAULT 'staff',
	`displayName` varchar(80) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workspaceMembers_id` PRIMARY KEY(`id`),
	CONSTRAINT `workspace_members_workspace_user_idx` UNIQUE(`workspaceId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`location` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workspaces_id` PRIMARY KEY(`id`),
	CONSTRAINT `workspaces_owner_name_idx` UNIQUE(`ownerId`,`name`)
);
