CREATE TABLE "cms_plugin_storage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"plugin" varchar(200) NOT NULL,
	"collection" varchar(200) NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cms_plugin_storage" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cms_plugin_storage" ADD CONSTRAINT "cms_plugin_storage_organization_id_cms_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."cms_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_plugin_storage_org_plugin_collection_created" ON "cms_plugin_storage" USING btree ("organization_id","plugin","collection","created_at");--> statement-breakpoint
CREATE POLICY "plugin_storage_org_isolation" ON "cms_plugin_storage" AS PERMISSIVE FOR ALL TO public USING ((current_setting('app.override_access', true) = 'true') OR (current_setting('app.organization_id', true) <> '' AND organization_id IN (SELECT current_setting('app.organization_id', true)::uuid UNION SELECT id FROM cms_organizations WHERE parent_organization_id = current_setting('app.organization_id', true)::uuid))) WITH CHECK ((current_setting('app.override_access', true) = 'true') OR (current_setting('app.organization_id', true) <> '' AND organization_id = current_setting('app.organization_id', true)::uuid));