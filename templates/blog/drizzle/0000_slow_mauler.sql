CREATE TABLE `cms_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`asset_type` text NOT NULL,
	`filename` text NOT NULL,
	`original_filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer NOT NULL,
	`url` text NOT NULL,
	`path` text NOT NULL,
	`storage_adapter` text DEFAULT 'local' NOT NULL,
	`width` integer,
	`height` integer,
	`metadata` text,
	`title` text,
	`description` text,
	`alt` text,
	`credit_line` text,
	`created_by` text,
	`updated_by` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`organization_id`) REFERENCES `cms_organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_assets_org_id` ON `cms_assets` (`organization_id`);--> statement-breakpoint
CREATE TABLE `cms_document_references` (
	`referencer_id` text NOT NULL,
	`ref_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`referencer_id`, `ref_id`),
	FOREIGN KEY (`referencer_id`) REFERENCES `cms_documents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ref_id`) REFERENCES `cms_documents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `cms_organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_doc_refs_ref_id` ON `cms_document_references` (`ref_id`,`organization_id`);--> statement-breakpoint
CREATE TABLE `cms_document_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`version_number` integer NOT NULL,
	`event_type` text NOT NULL,
	`data` text NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `cms_documents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `cms_organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_doc_versions_doc_org` ON `cms_document_versions` (`document_id`,`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `cms_document_versions_document_id_version_number_unique` ON `cms_document_versions` (`document_id`,`version_number`);--> statement-breakpoint
CREATE TABLE `cms_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'draft',
	`draft_data` text,
	`published_data` text,
	`published_hash` text,
	`created_by` text,
	`updated_by` text,
	`published_at` integer,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`organization_id`) REFERENCES `cms_organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_documents_org_id` ON `cms_documents` (`organization_id`);--> statement-breakpoint
CREATE INDEX `idx_documents_type` ON `cms_documents` (`type`);--> statement-breakpoint
CREATE INDEX `idx_documents_org_type` ON `cms_documents` (`organization_id`,`type`);--> statement-breakpoint
CREATE TABLE `cms_instance_settings` (
	`id` text PRIMARY KEY DEFAULT 'default' NOT NULL,
	`settings` text DEFAULT '{}' NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cms_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`token` text NOT NULL,
	`invited_by` text NOT NULL,
	`expires_at` integer NOT NULL,
	`accepted_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `cms_organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cms_invitations_token_unique` ON `cms_invitations` (`token`);--> statement-breakpoint
CREATE INDEX `idx_invitations_email` ON `cms_invitations` (`email`);--> statement-breakpoint
CREATE INDEX `idx_invitations_org_id` ON `cms_invitations` (`organization_id`);--> statement-breakpoint
CREATE TABLE `cms_organization_members` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`preferences` text,
	`invitation_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `cms_organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invitation_id`) REFERENCES `cms_invitations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_org_members_user_id` ON `cms_organization_members` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_org_members_org_id` ON `cms_organization_members` (`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `cms_organization_members_organization_id_user_id_unique` ON `cms_organization_members` (`organization_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `cms_organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`parent_organization_id` text,
	`metadata` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`parent_organization_id`) REFERENCES `cms_organizations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cms_organizations_slug_unique` ON `cms_organizations` (`slug`);--> statement-breakpoint
CREATE TABLE `cms_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`capabilities` text DEFAULT '[]' NOT NULL,
	`is_built_in` text DEFAULT 'false' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `cms_organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cms_roles_organization_id_name_unique` ON `cms_roles` (`organization_id`,`name`);--> statement-breakpoint
CREATE TABLE `cms_schema_types` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`title` text NOT NULL,
	`type` text NOT NULL,
	`description` text,
	`fields` text NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cms_schema_types_name_unique` ON `cms_schema_types` (`name`);--> statement-breakpoint
CREATE TABLE `cms_user_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`role` text DEFAULT 'editor' NOT NULL,
	`preferences` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cms_user_sessions` (
	`user_id` text PRIMARY KEY NOT NULL,
	`active_organization_id` text,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`active_organization_id`) REFERENCES `cms_organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `apikey` (
	`id` text PRIMARY KEY NOT NULL,
	`config_id` text DEFAULT 'default' NOT NULL,
	`name` text,
	`start` text,
	`prefix` text,
	`key` text NOT NULL,
	`reference_id` text NOT NULL,
	`refill_interval` integer,
	`refill_amount` integer,
	`last_refill_at` integer,
	`enabled` integer DEFAULT true,
	`rate_limit_enabled` integer DEFAULT true,
	`rate_limit_time_window` integer DEFAULT 86400000,
	`rate_limit_max` integer DEFAULT 10000,
	`request_count` integer DEFAULT 0,
	`remaining` integer,
	`last_request` integer,
	`expires_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`permissions` text,
	`metadata` text
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
