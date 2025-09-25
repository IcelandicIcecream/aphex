ALTER TABLE "cms_documents" RENAME COLUMN "data" TO "published_data";--> statement-breakpoint
ALTER TABLE "cms_documents" RENAME COLUMN "slug" TO "published_at";--> statement-breakpoint
ALTER TABLE "cms_documents" ADD COLUMN "draft_data" jsonb;