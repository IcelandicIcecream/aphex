ALTER TABLE "apikey" DROP CONSTRAINT "apikey_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "apikey" ADD COLUMN "config_id" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "apikey" ADD COLUMN "reference_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "apikey" DROP COLUMN "user_id";