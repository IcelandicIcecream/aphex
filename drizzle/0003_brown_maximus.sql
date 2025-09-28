CREATE TYPE "public"."document_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."schema_type" AS ENUM('document', 'object');--> statement-breakpoint
ALTER TABLE "cms_documents" ALTER COLUMN "status" SET DATA TYPE document_status;--> statement-breakpoint
ALTER TABLE "cms_schema_types" ALTER COLUMN "type" SET DATA TYPE schema_type;--> statement-breakpoint
ALTER TABLE "cms_documents" ADD COLUMN "published_hash" varchar(20);
