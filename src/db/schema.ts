import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  date,
  timestamp,
  uniqueIndex,
  integer,
  check,
} from "drizzle-orm/pg-core";
import { statuses, services } from "@/features/leads/constants";
export { statuses, services } from "@/features/leads/constants";
export const leadStatus = pgEnum("lead_status", statuses);
export const serviceInterest = pgEnum("service_interest", services);
export const leads = pgTable(
  "leads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyName: varchar("company_name", { length: 200 }).notNull(),
    websiteUrl: varchar("website_url", { length: 2048 }),
    contactName: varchar("contact_name", { length: 200 }),
    contactEmail: varchar("contact_email", { length: 254 }),
    country: varchar("country", { length: 100 }),
    source: varchar("source", { length: 200 }),
    serviceInterest: serviceInterest("service_interest"),
    status: leadStatus("status").default("new").notNull(),
    notes: text("notes"),
    nextFollowUp: date("next_follow_up"),
    targetService: serviceInterest("target_service"),
    problemEvidence: text("problem_evidence"),
    evidenceUrl: varchar("evidence_url", { length: 2048 }),
    serviceFitEvidence: text("service_fit_evidence"),
    contactRelevanceEvidence: text("contact_relevance_evidence"),
    reachabilityEvidence: text("reachability_evidence"),
    buyingSignalEvidence: text("buying_signal_evidence"),
    buyingSignalUrl: varchar("buying_signal_url", { length: 2048 }),
    qualificationScore: integer("qualification_score").default(0).notNull(),
    qualificationExplanation: text("qualification_explanation")
      .default(
        "Not reviewed. Missing qualification evidence; no points awarded.",
      )
      .notNull(),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    check("leads_score_range", sql`${t.qualificationScore} between 0 and 100`),
    uniqueIndex("leads_contact_email_unique")
      .on(sql`lower(${t.contactEmail})`)
      .where(sql`${t.contactEmail} is not null and ${t.contactEmail} <> ''`),
  ],
);
export type Lead = typeof leads.$inferSelect;
export const messageChannel = pgEnum("message_channel", ["email", "linkedin"]);
export const outreachDrafts = pgTable("outreach_drafts", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  channel: messageChannel("channel").notNull(),
  subject: varchar("subject", { length: 200 }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export type OutreachDraft = typeof outreachDrafts.$inferSelect;
export const campaigns = pgTable('campaigns', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 200 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
export const opportunities = pgTable('opportunities', {
  id: uuid('id').defaultRandom().primaryKey(),
  campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
  leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
  companyName: varchar('company_name', { length: 200 }),
  sourceUrl: varchar('source_url', { length: 2048 }),
  platform: varchar('platform', { length: 200 }),
  observedNeed: text('observed_need'),
  operatorEvidence: text('operator_evidence'),
  contactName: varchar('contact_name', { length: 200 }),
  contactEmail: varchar('contact_email', { length: 254 }),
  targetService: serviceInterest('target_service'),
  decisionMakerEvidence: text('decision_maker_evidence'),
  explicitRequest: integer('explicit_request').default(0).notNull(),
  needDate: date('need_date'),
  followUpDate: date('follow_up_date'),
  retrievedEvidence: text('retrieved_evidence'),
  retrievedUrl: varchar('retrieved_url', { length: 2048 }),
  retrievedAt: timestamp('retrieved_at', { withTimezone: true }),
  retrievalStatus: varchar('retrieval_status', { length: 30 }).default('not_retrieved').notNull(),
  retrievalMessage: text('retrieval_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [uniqueIndex('opportunities_source_url_unique').on(t.sourceUrl).where(sql`${t.sourceUrl} is not null`)]);
export type Opportunity = typeof opportunities.$inferSelect;
