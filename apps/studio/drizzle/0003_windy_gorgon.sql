ALTER TABLE "cms_document_versions" ALTER COLUMN "event_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."version_event";--> statement-breakpoint
CREATE TYPE "public"."version_event" AS ENUM('draft', 'publish');--> statement-breakpoint
ALTER TABLE "cms_document_versions" ALTER COLUMN "event_type" SET DATA TYPE "public"."version_event" USING "event_type"::"public"."version_event";