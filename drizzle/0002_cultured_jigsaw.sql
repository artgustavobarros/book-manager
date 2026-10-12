ALTER TABLE "books" ADD COLUMN "lent_at" timestamp with time zone;--> statement-breakpoint
UPDATE "books" SET "lent_at" = "updated_at" WHERE "status" = 'emprestado';