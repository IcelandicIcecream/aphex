CREATE TABLE "cms_asset_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"document_type" varchar(100) NOT NULL,
	"field_path" text NOT NULL,
	"plane" varchar(16) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cms_asset_references" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cms_asset_references" ADD CONSTRAINT "cms_asset_references_organization_id_cms_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."cms_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_asset_references" ADD CONSTRAINT "cms_asset_references_asset_id_cms_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."cms_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_asset_references" ADD CONSTRAINT "cms_asset_references_document_id_cms_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."cms_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_asset_references_asset" ON "cms_asset_references" USING btree ("organization_id","asset_id");--> statement-breakpoint
CREATE INDEX "idx_asset_references_document" ON "cms_asset_references" USING btree ("organization_id","document_id");--> statement-breakpoint
CREATE POLICY "asset_references_org_isolation" ON "cms_asset_references" AS PERMISSIVE FOR ALL TO public USING ((current_setting('app.override_access', true) = 'true') OR (current_setting('app.organization_id', true) <> '' AND organization_id IN (SELECT current_setting('app.organization_id', true)::uuid UNION SELECT id FROM cms_organizations WHERE parent_organization_id = current_setting('app.organization_id', true)::uuid))) WITH CHECK ((current_setting('app.override_access', true) = 'true') OR (current_setting('app.organization_id', true) <> '' AND organization_id = current_setting('app.organization_id', true)::uuid));