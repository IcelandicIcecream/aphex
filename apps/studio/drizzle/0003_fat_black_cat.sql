ALTER TABLE "cms_assets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cms_documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cms_organizations" ADD COLUMN "parent_organization_id" uuid;--> statement-breakpoint
ALTER TABLE "cms_organizations" ADD CONSTRAINT "cms_organizations_parent_organization_id_cms_organizations_id_fk" FOREIGN KEY ("parent_organization_id") REFERENCES "public"."cms_organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "assets_org_isolation" ON "cms_assets" AS PERMISSIVE FOR ALL TO public USING (
				organization_id IN (
					SELECT current_setting('app.organization_id', true)::uuid
					UNION
					SELECT id FROM "cms_organizations"
					WHERE parent_organization_id = current_setting('app.organization_id', true)::uuid
				)
			) WITH CHECK (
				organization_id = current_setting('app.organization_id', true)::uuid
			);--> statement-breakpoint
CREATE POLICY "documents_org_isolation" ON "cms_documents" AS PERMISSIVE FOR ALL TO public USING (
				organization_id IN (
					SELECT current_setting('app.organization_id', true)::uuid
					UNION
					SELECT id FROM "cms_organizations"
					WHERE parent_organization_id = current_setting('app.organization_id', true)::uuid
				)
			) WITH CHECK (
				organization_id = current_setting('app.organization_id', true)::uuid
			);