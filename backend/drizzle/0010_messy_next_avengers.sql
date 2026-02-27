CREATE TABLE "vehicles" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"mileage" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
