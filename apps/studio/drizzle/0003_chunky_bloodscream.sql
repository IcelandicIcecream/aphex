CREATE TABLE "cms_user_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"role" text DEFAULT 'editor' NOT NULL,
	"preferences" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
