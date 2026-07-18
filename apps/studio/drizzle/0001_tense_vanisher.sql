CREATE TYPE "public"."job_status" AS ENUM('pending', 'leased', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TABLE "cms_domain_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"type" varchar(200) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"correlation_id" text,
	"causation_id" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cms_domain_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "cms_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"type" varchar(200) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "job_status" DEFAULT 'pending' NOT NULL,
	"run_at" timestamp DEFAULT now() NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"lease_owner" text,
	"lease_expires_at" timestamp,
	"last_error" text,
	"idempotency_key" text,
	"correlation_id" text,
	"causation_id" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	CONSTRAINT "uq_jobs_org_idempotency" UNIQUE("organization_id","idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "cms_jobs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cms_domain_events" ADD CONSTRAINT "cms_domain_events_organization_id_cms_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."cms_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_jobs" ADD CONSTRAINT "cms_jobs_organization_id_cms_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."cms_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_domain_events_org_created" ON "cms_domain_events" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_domain_events_org_type" ON "cms_domain_events" USING btree ("organization_id","type");--> statement-breakpoint
CREATE INDEX "idx_jobs_status_run_at" ON "cms_jobs" USING btree ("status","run_at");--> statement-breakpoint
CREATE INDEX "idx_jobs_org_id" ON "cms_jobs" USING btree ("organization_id");--> statement-breakpoint
CREATE POLICY "domain_events_org_isolation" ON "cms_domain_events" AS PERMISSIVE FOR ALL TO public USING ((current_setting('app.override_access', true) = 'true') OR (current_setting('app.organization_id', true) <> '' AND organization_id IN (SELECT current_setting('app.organization_id', true)::uuid UNION SELECT id FROM cms_organizations WHERE parent_organization_id = current_setting('app.organization_id', true)::uuid))) WITH CHECK ((current_setting('app.override_access', true) = 'true') OR (current_setting('app.organization_id', true) <> '' AND organization_id = current_setting('app.organization_id', true)::uuid));--> statement-breakpoint
CREATE POLICY "jobs_org_isolation" ON "cms_jobs" AS PERMISSIVE FOR ALL TO public USING ((current_setting('app.override_access', true) = 'true') OR (current_setting('app.organization_id', true) <> '' AND organization_id IN (SELECT current_setting('app.organization_id', true)::uuid UNION SELECT id FROM cms_organizations WHERE parent_organization_id = current_setting('app.organization_id', true)::uuid))) WITH CHECK ((current_setting('app.override_access', true) = 'true') OR (current_setting('app.organization_id', true) <> '' AND organization_id = current_setting('app.organization_id', true)::uuid));