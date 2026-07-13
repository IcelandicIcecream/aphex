CREATE TABLE "cms_plugin_settings" (
	"organization_id" uuid NOT NULL,
	"plugin_id" varchar(200) NOT NULL,
	"values" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cms_plugin_settings_organization_id_plugin_id_pk" PRIMARY KEY("organization_id","plugin_id")
);
--> statement-breakpoint
ALTER TABLE "cms_plugin_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cms_plugin_settings" ADD CONSTRAINT "cms_plugin_settings_organization_id_cms_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."cms_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "plugin_settings_org_isolation" ON "cms_plugin_settings" AS PERMISSIVE FOR ALL TO public USING ((current_setting('app.override_access', true) = 'true') OR (current_setting('app.organization_id', true) <> '' AND organization_id IN (SELECT current_setting('app.organization_id', true)::uuid UNION SELECT id FROM cms_organizations WHERE parent_organization_id = current_setting('app.organization_id', true)::uuid))) WITH CHECK ((current_setting('app.override_access', true) = 'true') OR (current_setting('app.organization_id', true) <> '' AND organization_id = current_setting('app.organization_id', true)::uuid));
