CREATE TABLE "pay_stubs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"pay_date" date NOT NULL,
	"employer" text NOT NULL,
	"gross" numeric(15, 4) NOT NULL,
	"retirement" numeric(15, 4) DEFAULT '0' NOT NULL,
	"employer_match" numeric(15, 4) DEFAULT '0' NOT NULL,
	"stock_options" numeric(15, 4) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pay_stubs" ADD CONSTRAINT "pay_stubs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;