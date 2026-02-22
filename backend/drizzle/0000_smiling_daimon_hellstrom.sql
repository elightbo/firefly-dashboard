CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"balance" numeric(15, 4) DEFAULT '0' NOT NULL,
	"currency_code" text DEFAULT 'USD' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"period" text,
	"limit" numeric(15, 4),
	"spent" numeric(15, 4) DEFAULT '0' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"target_amount" numeric(15, 4) NOT NULL,
	"current_amount" numeric(15, 4) DEFAULT '0' NOT NULL,
	"deadline" date,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "piggy_banks" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"target_amount" numeric(15, 4) NOT NULL,
	"current_amount" numeric(15, 4) DEFAULT '0' NOT NULL,
	"deadline" date,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"piggy_bank_id" text,
	"date" date NOT NULL,
	"amount" numeric(15, 4) NOT NULL,
	"type" text NOT NULL,
	"category" text,
	"description" text,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_piggy_bank_id_piggy_banks_id_fk" FOREIGN KEY ("piggy_bank_id") REFERENCES "public"."piggy_banks"("id") ON DELETE set null ON UPDATE no action;