CREATE TABLE "memories" (
	"id" serial PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "budget_name" text;