import "server-only";
import { eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { campaigns, opportunities } from "@/db/schema";
import { selectedBusiness, websiteKey } from "./business-source";
import { workflowQuestion } from "./business-types";
export async function saveBusiness(
  token: string,
  id: string,
  campaignId: string,
) {
  z.uuid().parse(token);
  z.uuid().parse(id);
  z.uuid().parse(campaignId);
  const { report, business: b } = selectedBusiness(token, id);
  const platform = `Overture Places · ${b.id}`;
  const website = b.websites[0] || null;
  const source = `https://stac.overturemaps.org/${report.release}/collections.parquet`;
  return getDb().transaction(async (tx) => {
    // One GERS identity cannot be saved twice concurrently, even without a website.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${b.id}))`);
    if (
      !(
        await tx
          .select({ id: campaigns.id })
          .from(campaigns)
          .where(eq(campaigns.id, campaignId))
      ).length
    )
      throw new Error("Select an existing campaign.");
    const matchesWebsite = website
      ? sql`rtrim(regexp_replace(lower(split_part(${opportunities.sourceUrl}, '?', 1)), '^https?://(www\.)?', ''), '/') = ${websiteKey(website).toLowerCase()}`
      : undefined;
    const [existing] = await tx
      .select({ id: opportunities.id })
      .from(opportunities)
      .where(or(eq(opportunities.platform, platform), matchesWebsite))
      .limit(1);
    if (existing) return { ...existing, existing: true };
    const evidence = [
      `Overture Places catalogue assertion; GERS ${b.id}; release ${report.release}; retrieved ${report.checkedAt}.`,
      `Business: ${b.name}; location: ${b.city ?? "unknown"}, ${b.region ?? "unknown"}, US; category: ${b.category}.`,
      `Source-listed websites (not independently verified): ${b.websites.join(", ") || "none"}.`,
      `Source-listed public business phones (not called/verified): ${b.phones.join(", ") || "none"}.`,
      `Source confidence (existence, NOT qualification): ${b.confidence ?? "unknown"}; operating status: ${b.status ?? "unknown"}.`,
      `Provenance: ${b.sources.map((s) => `${s.dataset ?? "unknown"} (${s.license ?? "unknown"}; updated ${s.updateTime ?? "unknown"})`).join("; ")}.`,
      "Company size, decision-maker, official website ownership, automation need, budget and buying intent are not established.",
      workflowQuestion,
    ]
      .join("\n")
      .slice(0, 4000);
    const [saved] = await tx
      .insert(opportunities)
      .values({
        campaignId,
        companyName: b.name,
        sourceUrl: website,
        platform,
        targetService: "automation",
        retrievedEvidence: evidence,
        retrievedUrl: source,
        retrievedAt: new Date(report.checkedAt),
        retrievalStatus: "retrieved",
        retrievalMessage:
          "Open catalogue retrieved; company website/contact unverified. Review evidence before CRM handoff or outreach. No buying signal established.",
      })
      .onConflictDoNothing()
      .returning({ id: opportunities.id });
    if (saved) return { ...saved, existing: false };
    const [duplicate] = await tx
      .select({ id: opportunities.id })
      .from(opportunities)
      .where(eq(opportunities.sourceUrl, website!))
      .limit(1);
    if (!duplicate) throw new Error("Could not save business. Retry.");
    return { ...duplicate, existing: true };
  });
}
