CREATE TYPE "public"."agent_change_set_status" AS ENUM('in_progress', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "cms_agent_change_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"created_by" text,
	"status" "agent_change_set_status" DEFAULT 'in_progress' NOT NULL,
	"summary" text,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "cms_agent_change_sets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "cms_agent_operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"change_set_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"collection" text NOT NULL,
	"document_id" text NOT NULL,
	"tool_name" text NOT NULL,
	"arguments" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"success" boolean NOT NULL,
	"error" text,
	"version_before" integer,
	"version_after" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cms_agent_operations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cms_agent_change_sets" ADD CONSTRAINT "cms_agent_change_sets_organization_id_cms_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."cms_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_agent_operations" ADD CONSTRAINT "cms_agent_operations_change_set_id_cms_agent_change_sets_id_fk" FOREIGN KEY ("change_set_id") REFERENCES "public"."cms_agent_change_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_agent_operations" ADD CONSTRAINT "cms_agent_operations_organization_id_cms_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."cms_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_agent_change_sets_org_created" ON "cms_agent_change_sets" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_agent_operations_change_set" ON "cms_agent_operations" USING btree ("change_set_id");--> statement-breakpoint
CREATE POLICY "agent_change_sets_org_isolation" ON "cms_agent_change_sets" AS PERMISSIVE FOR ALL TO public USING ((current_setting('app.override_access', true) = 'true') OR (current_setting('app.organization_id', true) <> '' AND organization_id IN (SELECT current_setting('app.organization_id', true)::uuid UNION SELECT id FROM cms_organizations WHERE parent_organization_id = current_setting('app.organization_id', true)::uuid))) WITH CHECK ((current_setting('app.override_access', true) = 'true') OR (current_setting('app.organization_id', true) <> '' AND organization_id = current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "agent_operations_org_isolation" ON "cms_agent_operations" AS PERMISSIVE FOR ALL TO public USING ((current_setting('app.override_access', true) = 'true') OR (current_setting('app.organization_id', true) <> '' AND organization_id IN (SELECT current_setting('app.organization_id', true)::uuid UNION SELECT id FROM cms_organizations WHERE parent_organization_id = current_setting('app.organization_id', true)::uuid))) WITH CHECK ((current_setting('app.override_access', true) = 'true') OR (current_setting('app.organization_id', true) <> '' AND organization_id = current_setting('app.organization_id', true)::uuid));