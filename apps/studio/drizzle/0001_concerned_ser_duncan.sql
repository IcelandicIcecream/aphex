CREATE INDEX "idx_assets_org_id" ON "cms_assets" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_doc_versions_doc_org" ON "cms_document_versions" USING btree ("document_id","organization_id");--> statement-breakpoint
CREATE INDEX "idx_documents_org_id" ON "cms_documents" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_documents_type" ON "cms_documents" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_documents_org_type" ON "cms_documents" USING btree ("organization_id","type");--> statement-breakpoint
CREATE INDEX "idx_invitations_email" ON "cms_invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_invitations_org_id" ON "cms_invitations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_org_members_user_id" ON "cms_organization_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_org_members_org_id" ON "cms_organization_members" USING btree ("organization_id");