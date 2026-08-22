ALTER TABLE "cms_documents" ADD COLUMN "search_text" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_documents_search_gin" ON "cms_documents" USING gin (to_tsvector('simple', coalesce(search_text, '')));
