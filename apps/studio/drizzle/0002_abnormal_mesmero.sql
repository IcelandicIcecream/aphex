CREATE TABLE "cms_event_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"event_type" varchar(200) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"correlation_id" text,
	"causation_id" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "cms_event_outbox" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cms_event_outbox" ADD CONSTRAINT "cms_event_outbox_organization_id_cms_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."cms_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_event_outbox" ADD CONSTRAINT "cms_event_outbox_event_id_cms_domain_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."cms_domain_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_event_outbox_unprocessed" ON "cms_event_outbox" USING btree ("created_at") WHERE processed_at IS NULL;--> statement-breakpoint
CREATE POLICY "event_outbox_org_isolation" ON "cms_event_outbox" AS PERMISSIVE FOR ALL TO public USING ((current_setting('app.override_access', true) = 'true') OR (current_setting('app.organization_id', true) <> '' AND organization_id IN (SELECT current_setting('app.organization_id', true)::uuid UNION SELECT id FROM cms_organizations WHERE parent_organization_id = current_setting('app.organization_id', true)::uuid))) WITH CHECK ((current_setting('app.override_access', true) = 'true') OR (current_setting('app.organization_id', true) <> '' AND organization_id = current_setting('app.organization_id', true)::uuid));