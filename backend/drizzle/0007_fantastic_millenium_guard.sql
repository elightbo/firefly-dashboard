CREATE TABLE "net_worth_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"total" numeric(15, 4) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "net_worth_snapshots_date_unique" UNIQUE("date")
);
