CREATE TYPE "public"."sheet_export_run_status" AS ENUM('processing', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."sheet_export_status" AS ENUM('pending', 'enabled', 'reconnect', 'disabled');--> statement-breakpoint
CREATE TABLE "sheet_export_connections" (
	"user_id" text PRIMARY KEY NOT NULL,
	"account_id" text,
	"spreadsheet_id" text,
	"status" "sheet_export_status" DEFAULT 'pending' NOT NULL,
	"last_succeeded_at" timestamp with time zone,
	"last_failed_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sheet_export_runs" (
	"user_id" text NOT NULL,
	"week_key" text NOT NULL,
	"status" "sheet_export_run_status" NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"lease_until" timestamp with time zone,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"error" text,
	CONSTRAINT "sheet_export_runs_user_id_week_key_pk" PRIMARY KEY("user_id","week_key")
);
--> statement-breakpoint
ALTER TABLE "sheet_export_connections" ADD CONSTRAINT "sheet_export_connections_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sheet_export_connections" ADD CONSTRAINT "sheet_export_connections_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sheet_export_runs" ADD CONSTRAINT "sheet_export_runs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sheet_export_runs_status_idx" ON "sheet_export_runs" USING btree ("status","lease_until");