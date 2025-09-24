CREATE TABLE "cms_schema_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"title" varchar(200) NOT NULL,
	"type" varchar(20) NOT NULL,
	"description" text,
	"schema" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "cms_schema_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
DROP TABLE "cms_blocks" CASCADE;--> statement-breakpoint
DROP TABLE "cms_collections" CASCADE;--> statement-breakpoint
ALTER TABLE "cms_documents" RENAME COLUMN "collection" TO "type";