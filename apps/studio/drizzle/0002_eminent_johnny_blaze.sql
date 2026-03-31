CREATE TYPE "public"."version_event" AS ENUM('draft', 'publish', 'restore');--> statement-breakpoint
CREATE TABLE "cms_document_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"event_type" "version_event" NOT NULL,
	"data" jsonb NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cms_document_versions_document_id_version_number_unique" UNIQUE("document_id","version_number")
);
--> statement-breakpoint
ALTER TABLE "cms_document_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cms_document_versions" ADD CONSTRAINT "cms_document_versions_document_id_cms_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."cms_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_document_versions" ADD CONSTRAINT "cms_document_versions_organization_id_cms_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."cms_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "document_versions_org_isolation" ON "cms_document_versions" AS PERMISSIVE FOR ALL TO public USING ((current_setting('app.override_access', true) = 'true') OR (organization_id IN (SELECT current_setting('app.organization_id', true)::uuid UNION SELECT id FROM cms_organizations WHERE parent_organization_id = current_setting('app.organization_id', true)::uuid))) WITH CHECK ((current_setting('app.override_access', true) = 'true') OR (organization_id = current_setting('app.organization_id', true)::uuid));