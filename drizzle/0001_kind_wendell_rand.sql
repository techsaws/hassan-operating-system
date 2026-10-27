ALTER TABLE "leads" ADD COLUMN "target_service" "service_interest";--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "problem_evidence" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "evidence_url" varchar(2048);--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "service_fit_evidence" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "contact_relevance_evidence" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "reachability_evidence" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "buying_signal_evidence" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "buying_signal_url" varchar(2048);--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "qualification_score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "qualification_explanation" text DEFAULT 'Not reviewed. Missing qualification evidence; no points awarded.' NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "last_reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_score_range" CHECK ("leads"."qualification_score" between 0 and 100);