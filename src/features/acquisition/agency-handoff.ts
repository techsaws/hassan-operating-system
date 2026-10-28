import "server-only";
import { eq, sql, or } from "drizzle-orm";
import { getDb } from "@/db";
import { opportunities, campaigns } from "@/db/schema";
import { createCampaign } from "@/features/opportunities/mutations";
import type { UnifiedFinding } from "./types";
import { websiteKey } from "@/features/discovery/business-source";
export async function saveAgencyResearch(
  f: UnifiedFinding,
  campaignId: string,
) {
  if (f.provider !== "agencies" || !f.saveable || !f.identity)
    throw new Error("This finding is not an agency research candidate.");
  const campaign =
    campaignId ||
    (await createCampaign("Agency Partnerships — Engineering")).id;
  const website = f.agency?.website || null;
  const platform = "Pick an Agency · " + f.sourceId;
  return getDb().transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${website ? "agency:" + websiteKey(website) : platform}))`,
    );
    if (
      !(
        await tx
          .select({ id: campaigns.id })
          .from(campaigns)
          .where(eq(campaigns.id, campaign))
      ).length
    )
      throw new Error("Select an existing campaign.");
    const [existing] = await tx
      .select({ id: opportunities.id })
      .from(opportunities)
      .where(
        or(
          eq(opportunities.platform, platform),
          website
            ? sql`rtrim(regexp_replace(lower(split_part(${opportunities.sourceUrl}, '?', 1)), '^https?://(www\.)?', ''), '/') = ${websiteKey(website).toLowerCase()}`
            : undefined,
        ),
      )
      .limit(1);
    if (existing) return existing.id;
    const sourceUrl = website || f.url;
    const [saved] = await tx
      .insert(opportunities)
      .values({
        companyName: f.identity!.name,
        sourceUrl,
        platform,
        campaignId: campaign,
        targetService: "software",
        retrievedEvidence:
          f.excerpt +
          "\nPartnership suitability is a hypothesis; demand, contact ownership and permission unknown.",
        retrievedUrl: f.evidence.sourceUrl,
        retrievedAt: new Date(f.seenAt),
        retrievalStatus: "retrieved",
        retrievalMessage:
          "Agency API retrieved; official website/contact and partnership demand remain unverified. No CRM lead created.",
      })
      .onConflictDoNothing()
      .returning({ id: opportunities.id });
    if (saved) return saved.id;
    const [duplicate] = await tx
      .select({ id: opportunities.id })
      .from(opportunities)
      .where(eq(opportunities.sourceUrl, sourceUrl));
    if (!duplicate) throw new Error("Agency research could not be saved.");
    return duplicate.id;
  });
}
