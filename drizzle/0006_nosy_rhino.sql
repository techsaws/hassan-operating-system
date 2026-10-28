CREATE TABLE "acquisition_entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(300) NOT NULL,
	"kind" varchar(30) NOT NULL,
	"canonical_domain" varchar(253),
	"identifiers" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "acquisition_entities_canonical_domain_unique" UNIQUE("canonical_domain")
);
--> statement-breakpoint
CREATE TABLE "acquisition_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(40) NOT NULL,
	"source_id" varchar(300) NOT NULL,
	"source_url" varchar(2048) NOT NULL,
	"entity_id" uuid,
	"pipeline" varchar(30) NOT NULL,
	"legacy_opportunity_id" uuid,
	"data" jsonb NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"first_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "acquisition_findings_source_url_unique" UNIQUE("source_url")
);
--> statement-breakpoint
CREATE TABLE "acquisition_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(40) NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"success" integer DEFAULT 0 NOT NULL,
	"network_attempt" integer DEFAULT 0 NOT NULL,
	"counts" jsonb,
	"error" text
);
--> statement-breakpoint
ALTER TABLE "acquisition_findings" ADD CONSTRAINT "acquisition_findings_entity_id_acquisition_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."acquisition_entities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acquisition_findings" ADD CONSTRAINT "acquisition_findings_legacy_opportunity_id_opportunities_id_fk" FOREIGN KEY ("legacy_opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "acquisition_provider_record_unique" ON "acquisition_findings" USING btree ("provider","source_id");