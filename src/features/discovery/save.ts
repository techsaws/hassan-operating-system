import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { campaigns, opportunities } from "@/db/schema";
import { discoveryInput, type DiscoveryMetadata } from "./types";
import { refreshFinding } from "./source";
export async function saveDiscoveredOpportunity(
  itemId: string,
  raw: unknown,
  fetcher: typeof fetch = fetch,
) {
  const input = discoveryInput.parse(raw);
  const db = getDb();
  if (!/^\d{1,12}$/.test(itemId)) throw new Error("Invalid discovery item.");
  if (
    !(
      await db
        .select({ id: campaigns.id })
        .from(campaigns)
        .where(eq(campaigns.id, input.campaignId))
        .limit(1)
    ).length
  )
    throw new Error("Select an existing campaign before saving.");
  const sourceUrl = `https://news.ycombinator.com/item?id=${itemId}`;
  const [existing] = await db
    .select({ id: opportunities.id })
    .from(opportunities)
    .where(eq(opportunities.sourceUrl, sourceUrl))
    .limit(1);
  if (existing) return { id: existing.id, existing: true };
  // Refresh source data; client-provided content is never accepted as evidence.
  const found = await refreshFinding(itemId, input, fetcher);
  const discovery: DiscoveryMetadata = {
    source: "hn_algolia",
    itemId,
    title: found.title,
    publishedAt: found.publishedAt,
    classification: found.classification,
    availability: found.availability,
    contactRoute: found.contactRoute,
    countryEvidence: found.countryEvidence,
    categoryEvidence: found.categoryEvidence,
  };
  const [saved] = await db
    .insert(opportunities)
    .values({
      campaignId: input.campaignId,
      sourceUrl: found.sourceUrl,
      companyName: found.companyName,
      platform: "HN via Algolia public API",
      targetService: input.targetService,
      contactEmail: found.contactEmail,
      discovery,
      retrievedEvidence: found.excerpt,
      retrievedUrl: `https://hn.algolia.com/api/v1/items/${itemId}`,
      retrievedAt: new Date(),
      retrievalStatus: "retrieved",
      retrievalMessage:
        "Retrieved from the public HN API. Classification is heuristic; identity, paid intent and current availability require review.",
    })
    .onConflictDoNothing()
    .returning({ id: opportunities.id });
  if (saved) return { id: saved.id, existing: false };
  const [duplicate] = await db
    .select({ id: opportunities.id })
    .from(opportunities)
    .where(eq(opportunities.sourceUrl, sourceUrl))
    .limit(1);
  if (!duplicate) throw new Error("Could not save opportunity. Retry.");
  return { id: duplicate.id, existing: true };
}
