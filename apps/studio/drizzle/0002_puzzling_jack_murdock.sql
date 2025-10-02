DROP TABLE "cms_user_profiles" CASCADE;--> statement-breakpoint
ALTER TABLE "cms_assets" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "cms_documents" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "cms_documents" ADD COLUMN "updated_by" text;