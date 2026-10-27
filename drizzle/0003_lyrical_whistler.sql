CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaigns_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid,
	"lead_id" uuid,
	"company_name" varchar(200),
	"source_url" varchar(2048),
	"platform" varchar(200),
	"observed_need" text,
	"operator_evidence" text,
	"contact_name" varchar(200),
	"contact_email" varchar(254),
	"target_service" "service_interest",
	"decision_maker_evidence" text,
	"explicit_request" integer DEFAULT 0 NOT NULL,
	"need_date" date,
	"follow_up_date" date,
	"retrieved_evidence" text,
	"retrieved_url" varchar(2048),
	"retrieved_at" timestamp with time zone,
	"retrieval_status" varchar(30) DEFAULT 'not_retrieved' NOT NULL,
	"retrieval_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "opportunities_source_url_unique" ON "opportunities" USING btree ("source_url") WHERE "opportunities"."source_url" is not null;