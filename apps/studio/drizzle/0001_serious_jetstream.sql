CREATE TABLE "cms_document_references" (
	"referencer_id" uuid NOT NULL,
	"ref_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cms_document_references_referencer_id_ref_id_pk" PRIMARY KEY("referencer_id","ref_id")
);
--> statement-breakpoint
ALTER TABLE "cms_document_references" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cms_document_references" ADD CONSTRAINT "cms_document_references_referencer_id_cms_documents_id_fk" FOREIGN KEY ("referencer_id") REFERENCES "public"."cms_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_document_references" ADD CONSTRAINT "cms_document_references_ref_id_cms_documents_id_fk" FOREIGN KEY ("ref_id") REFERENCES "public"."cms_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_document_references" ADD CONSTRAINT "cms_document_references_organization_id_cms_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."cms_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_doc_refs_ref_id" ON "cms_document_references" USING btree ("ref_id","organization_id");--> statement-breakpoint
CREATE POLICY "document_references_org_isolation" ON "cms_document_references" AS PERMISSIVE FOR ALL TO public USING ((current_setting('app.override_access', true) = 'true') OR (current_setting('app.organization_id', true) <> '' AND organization_id IN (SELECT current_setting('app.organization_id', true)::uuid UNION SELECT id FROM cms_organizations WHERE parent_organization_id = current_setting('app.organization_id', true)::uuid))) WITH CHECK ((current_setting('app.override_access', true) = 'true') OR (current_setting('app.organization_id', true) <> '' AND organization_id = current_setting('app.organization_id', true)::uuid));