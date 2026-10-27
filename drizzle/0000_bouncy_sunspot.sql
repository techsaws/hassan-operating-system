CREATE TYPE "public"."lead_status" AS ENUM('new', 'researching', 'qualified', 'contacted', 'replied', 'meeting', 'proposal', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "public"."service_interest" AS ENUM('automation', 'software', 'backend', 'security');--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" varchar(200) NOT NULL,
	"website_url" varchar(2048),
	"contact_name" varchar(200),
	"contact_email" varchar(254),
	"country" varchar(100),
	"source" varchar(200),
	"service_interest" "service_interest",
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"notes" text,
	"next_follow_up" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "leads_contact_email_unique" ON "leads" USING btree (lower("contact_email")) WHERE "leads"."contact_email" is not null and "leads"."contact_email" <> '';