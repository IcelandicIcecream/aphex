CREATE TABLE "cms_instance_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
