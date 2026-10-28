ALTER TABLE "acquisition_findings" DROP CONSTRAINT "acquisition_findings_source_url_unique";--> statement-breakpoint
UPDATE "acquisition_findings" SET "data" = jsonb_set("data", '{urlKind}', CASE WHEN "provider" = 'overture' AND "data"->'route' = 'null'::jsonb THEN '"catalogue"'::jsonb ELSE '"record"'::jsonb END) WHERE NOT ("data" ? 'urlKind');--> statement-breakpoint
CREATE UNIQUE INDEX "acquisition_record_url_unique" ON "acquisition_findings" USING btree ("source_url") WHERE "acquisition_findings"."data"->>'urlKind' = 'record';
