CREATE TYPE "public"."book_reading" AS ENUM('nao-lido', 'lendo', 'lido', 'abandonado');--> statement-breakpoint
CREATE TYPE "public"."book_situation" AS ENUM('em-casa', 'emprestado', 'doado');--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "reading" "book_reading" DEFAULT 'nao-lido' NOT NULL;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "situation" "book_situation" DEFAULT 'em-casa' NOT NULL;--> statement-breakpoint
-- Emprestados e doados ganham Leitura "Lido" se têm ano de leitura (ADR 0001).
UPDATE "books" SET
  "reading" = (CASE
    WHEN "status" IN ('emprestado', 'doado') THEN
      CASE WHEN "year_read" IS NOT NULL THEN 'lido' ELSE 'nao-lido' END
    ELSE "status"::text
  END)::"book_reading",
  "situation" = (CASE
    WHEN "status" IN ('emprestado', 'doado') THEN "status"::text
    ELSE 'em-casa'
  END)::"book_situation";--> statement-breakpoint
ALTER TABLE "books" DROP COLUMN "status";--> statement-breakpoint
DROP TYPE "public"."book_status";