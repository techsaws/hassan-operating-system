import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { campaigns, leads, opportunities } from "@/db/schema";
import { opportunityInput } from "./validation";
import {
  retrievePublicPage,
  ResearchError,
  type RetrievalDependencies,
} from "./retrieval";

export async function createCampaign(name: string) {
  name = z.string().trim().min(1).max(200).parse(name);
  const db = getDb();
  await db.insert(campaigns).values({ name }).onConflictDoNothing();
  return (await db.select().from(campaigns).where(eq(campaigns.name, name)))[0];
}
export async function writeOpportunity(id: string | null, input: unknown) {
  const data = opportunityInput.parse(input);
  if (id) z.uuid().parse(id);
  const db = getDb();
  if (!id) return (await db.insert(opportunities).values(data).returning())[0];
  // Clear old source facts atomically when the operator changes the source URL.
  const [saved] = await db
    .update(opportunities)
    .set({
      ...data,
      updatedAt: new Date(),
      discovery: sql`case when ${opportunities.sourceUrl} is not distinct from ${data.sourceUrl} then ${opportunities.discovery} else null end`,
      retrievedEvidence: sql`case when ${opportunities.sourceUrl} is not distinct from ${data.sourceUrl} then ${opportunities.retrievedEvidence} else null end`,
      retrievedUrl: sql`case when ${opportunities.sourceUrl} is not distinct from ${data.sourceUrl} then ${opportunities.retrievedUrl} else null end`,
      retrievedAt: sql`case when ${opportunities.sourceUrl} is not distinct from ${data.sourceUrl} then ${opportunities.retrievedAt} else null end`,
      retrievalStatus: sql`case when ${opportunities.sourceUrl} is not distinct from ${data.sourceUrl} then ${opportunities.retrievalStatus} else 'not_retrieved' end`,
      retrievalMessage: sql`case when ${opportunities.sourceUrl} is not distinct from ${data.sourceUrl} then ${opportunities.retrievalMessage} else null end`,
    })
    .where(eq(opportunities.id, id))
    .returning();
  if (!saved) throw new Error("Opportunity not found.");
  return saved;
}
export async function retrieveOpportunity(
  id: string,
  consent: boolean,
  deps?: RetrievalDependencies,
) {
  z.uuid().parse(id);
  if (consent !== true)
    throw new Error(
      "Confirm the page is public and website terms permit this request.",
    );
  const db = getDb();
  const [o] = await db
    .select()
    .from(opportunities)
    .where(eq(opportunities.id, id));
  if (!o?.sourceUrl) throw new Error("Save a source URL before retrieving.");
  const condition = and(
    eq(opportunities.id, id),
    eq(opportunities.sourceUrl, o.sourceUrl),
  );
  try {
    const result = await retrievePublicPage(
      o.sourceUrl,
      o.observedNeed ?? "",
      deps,
    );
    const [saved] = await db
      .update(opportunities)
      .set({
        retrievedEvidence: result.excerpt,
        retrievedUrl: result.sourceUrl,
        retrievedAt: result.retrievedAt,
        retrievalStatus: "retrieved",
        retrievalMessage:
          "Public text retrieved; claims and buying intent are not independently verified.",
        updatedAt: new Date(),
      })
      .where(condition)
      .returning();
    if (!saved)
      throw new Error("The source changed while retrieving. Save and retry.");
    return saved;
  } catch (e) {
    const message =
      e instanceof ResearchError
        ? e.message
        : "Retrieval could not be saved. Save the current source and retry; manual research remains available.";
    await db
      .update(opportunities)
      .set({
        retrievalStatus: "manual_only",
        retrievalMessage: message,
        updatedAt: new Date(),
      })
      .where(condition);
    throw e;
  }
}
export async function linkOpportunityLead(id: string) {
  z.uuid().parse(id);
  return getDb().transaction(async (tx) => {
    const [o] = await tx
      .select()
      .from(opportunities)
      .where(eq(opportunities.id, id))
      .for("update");
    if (!o) throw new Error("Opportunity not found.");
    if (o.leadId) return { leadId: o.leadId, existing: true };
    if (!o.companyName)
      throw new Error("Record the company name before creating a CRM lead.");
    let leadId: string | undefined;
    if (o.contactEmail)
      leadId = (
        await tx
          .select({ id: leads.id })
          .from(leads)
          .where(
            eq(sql`lower(${leads.contactEmail})`, o.contactEmail.toLowerCase()),
          )
          .limit(1)
      )[0]?.id;
    let existing = Boolean(leadId);
    if (!leadId) {
      const notes = `Opportunity research\nObserved need (operator assertion): ${o.observedNeed ?? "Not recorded"}\nOperator evidence: ${o.operatorEvidence ?? "Not recorded"}\nLast retrieved excerpt (${o.retrievedAt?.toISOString() ?? "not retrieved"}; ${o.retrievedUrl ?? "no retrieved source"}): ${o.retrievedEvidence ?? "None"}\nAll claims require human review.`;
      const [created] = await tx
        .insert(leads)
        .values({
          companyName: o.companyName,
          contactName: o.contactName,
          contactEmail: o.contactEmail,
          source: o.platform,
          targetService: o.targetService,
          notes,
          problemEvidence: o.operatorEvidence || o.retrievedEvidence,
          evidenceUrl: o.operatorEvidence ? o.sourceUrl : o.retrievedUrl,
          nextFollowUp: o.followUpDate,
        })
        .onConflictDoNothing()
        .returning({ id: leads.id });
      leadId = created?.id;
      if (!leadId && o.contactEmail) {
        existing = true;
        leadId = (
          await tx
            .select({ id: leads.id })
            .from(leads)
            .where(
              eq(
                sql`lower(${leads.contactEmail})`,
                o.contactEmail.toLowerCase(),
              ),
            )
            .limit(1)
        )[0]?.id;
      }
    }
    if (!leadId) throw new Error("Could not create or link lead. Retry.");
    await tx
      .update(opportunities)
      .set({ leadId, updatedAt: new Date() })
      .where(eq(opportunities.id, id));
    return { leadId, existing };
  });
}
