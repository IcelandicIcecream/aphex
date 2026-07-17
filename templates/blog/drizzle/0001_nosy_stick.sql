CREATE TABLE `cms_plugin_settings` (
	`organization_id` text NOT NULL,
	`plugin_id` text NOT NULL,
	`values` text DEFAULT '{}' NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`organization_id`, `plugin_id`),
	FOREIGN KEY (`organization_id`) REFERENCES `cms_organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
