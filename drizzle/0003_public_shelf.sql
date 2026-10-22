ALTER TABLE "user_settings" ADD COLUMN "public_slug" text;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "public_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_public_slug_unique" UNIQUE("public_slug");