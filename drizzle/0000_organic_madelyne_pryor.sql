CREATE TYPE "public"."document_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."schema_type" AS ENUM('document', 'object');--> statement-breakpoint
CREATE TABLE "cms_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_type" varchar(20) NOT NULL,
	"filename" varchar(255) NOT NULL,
	"original_filename" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size" integer NOT NULL,
	"url" text NOT NULL,
	"path" text NOT NULL,
	"width" integer,
	"height" integer,
	"metadata" jsonb,
	"title" varchar(255),
	"description" text,
	"alt" text,
	"credit_line" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cms_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(100) NOT NULL,
	"status" "document_status" DEFAULT 'draft',
	"draft_data" jsonb,
	"published_data" jsonb,
	"published_hash" varchar(20),
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cms_schema_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"title" varchar(200) NOT NULL,
	"type" "schema_type" NOT NULL,
	"description" text,
	"schema" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "cms_schema_types_name_unique" UNIQUE("name")
);
