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
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("leads_contact_email_unique")
      .on(sql`lower(${t.contactEmail})`)
      .where(sql`${t.contactEmail} is not null and ${t.contactEmail} <> ''`),
  ],
);
export type Lead = typeof leads.$inferSelect;
