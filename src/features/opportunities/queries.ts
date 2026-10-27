import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { campaigns, opportunities } from "@/db/schema";
import { researchToday } from "./dates";
export function listCampaigns() {
  return getDb().select().from(campaigns).orderBy(campaigns.name);
}
export async function getOpportunity(id: string) {
  return (
    await getDb()
      .select()
      .from(opportunities)
      .where(eq(opportunities.id, id))
      .limit(1)
  )[0];
}
export function listOpportunities(campaignId?: string) {
  const o = opportunities;
  const today = researchToday();
  const evidence = sql`(nullif(trim(${o.operatorEvidence}), '') is not null or nullif(trim(${o.retrievedEvidence}), '') is not null)`;
  const source = sql`(${o.sourceUrl} is not null or ${o.retrievedUrl} is not null)`;
  const priority = sql`(case when ${o.followUpDate} <= ${today} then 60 else 0 end + case when ${o.explicitRequest} = 1 and ${evidence} and ${source} then 40 else 0 end + case when ${o.needDate} between (${today}::date - 30) and ${today}::date and ${o.observedNeed} is not null and ${evidence} and ${source} then 20 else 0 end + case when ${o.contactName} is not null and ${o.decisionMakerEvidence} is not null and ${source} then 15 else 0 end + case when ${evidence} and ${source} and ${o.observedNeed} is not null then 5 else 0 end)`;
  return getDb()
    .select()
    .from(o)
    .where(campaignId ? eq(o.campaignId, campaignId) : undefined)
    .orderBy(desc(priority), desc(o.updatedAt))
    .limit(500);
}
