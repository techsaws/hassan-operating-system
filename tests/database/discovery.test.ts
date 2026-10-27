import { config } from "dotenv";
config({ path: ".env", quiet: true });
import { test } from "node:test";
import assert from "node:assert/strict";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "../../src/db";
import { campaigns, opportunities, leads } from "../../src/db/schema";
import { saveDiscoveredOpportunity } from "../../src/features/discovery/save";
import {
  createCampaign,
  writeOpportunity,
} from "../../src/features/opportunities/mutations";
import type { DiscoveryInput } from "../../src/features/discovery/types";
test("selected discovery saves source facts without retyping, duplicating, creating leads, or overwriting manual research", async () => {
  const db = getDb();
  const marker = `verification-discovery-${crypto.randomUUID()}`;
  const itemId = String(70000000000 + Math.floor(Math.random() * 1000000000));
  const parentId = 999;
  const ids: string[] = [];
  let campaignId: string | undefined;
  let calls = 0;
  const fetcher: typeof fetch = async (url) => {
    calls++;
    const item = String(url).endsWith("/" + itemId);
    return Response.json(
      item
        ? {
            id: Number(itemId),
            parent_id: parentId,
            type: "comment",
            author: "synthetic-buyer",
            created_at: new Date().toISOString(),
            text: `SEEKING FREELANCER<p>Company: ${marker}</p><p>Company country: United States</p><p>We are a small business. Need paid help with scheduling and CRM automation.</p><p>Email: test@example.com</p>`,
          }
        : {
            id: parentId,
            type: "story",
            author: "synthetic-host",
            title: "Ask HN: Freelancer? Seeking freelancer? (October 2026)",
            created_at: new Date().toISOString(),
          },
    );
  };
  try {
    campaignId = (await createCampaign(marker)).id;
    const input: DiscoveryInput = {
      campaignId,
      targetService: "automation",
      country: "United States",
      buyerCategory: "small_business",
      keywords: "",
      includeUnknown: true,
    };
    const saved = await saveDiscoveredOpportunity(itemId, input, fetcher);
    ids.push(saved.id);
    assert.equal(calls, 2);
    assert.equal(saved.existing, false);
    const [o] = await db
      .select()
      .from(opportunities)
      .where(eq(opportunities.id, saved.id));
    assert.equal(o.companyName, marker);
    assert.equal(o.campaignId, campaignId);
    assert.equal(o.leadId, null);
    assert.equal(o.operatorEvidence, null);
    assert.equal(o.observedNeed, null);
    assert.ok(o.retrievedAt);
    assert.equal(o.discovery?.itemId, itemId);
    assert.ok(o.discovery?.publishedAt);
    assert.equal(o.discovery?.classification, "explicit_request");
    assert.match(o.retrievedEvidence!, /Need paid help/);
    assert.equal(
      (await db.select().from(leads).where(eq(leads.companyName, marker)))
        .length,
      0,
    );
    await db
      .update(opportunities)
      .set({
        operatorEvidence: "Manual research must remain intact",
        observedNeed: "Manually reviewed scheduling integration need",
      })
      .where(eq(opportunities.id, saved.id));
    const duplicate = await saveDiscoveredOpportunity(itemId, input, fetcher);
    assert.equal(duplicate.id, saved.id);
    assert.equal(duplicate.existing, true);
    assert.equal(
      calls,
      2,
      "existing entries should not refetch or be overwritten",
    );
    const [after] = await db
      .select()
      .from(opportunities)
      .where(eq(opportunities.id, saved.id));
    assert.equal(after.operatorEvidence, "Manual research must remain intact");
    const edited = await writeOpportunity(saved.id, {
      companyName: marker,
      sourceUrl: o.sourceUrl!,
      platform: "HN API",
      observedNeed: "Reviewed",
      operatorEvidence: "Reviewed evidence",
      contactName: "",
      contactEmail: "",
      targetService: "automation",
      campaignId,
      decisionMakerEvidence: "",
      explicitRequest: "no",
      needDate: "",
      followUpDate: "",
    });
    assert.equal(edited.discovery?.itemId, itemId);
    const changed = await writeOpportunity(saved.id, {
      companyName: marker,
      sourceUrl: `https://example.com/${marker}`,
      platform: "",
      observedNeed: "",
      operatorEvidence: "",
      contactName: "",
      contactEmail: "",
      targetService: "",
      campaignId,
      decisionMakerEvidence: "",
      explicitRequest: "no",
      needDate: "",
      followUpDate: "",
    });
    assert.equal(changed.discovery, null);
    assert.equal(changed.retrievedAt, null);
    const closedFetcher: typeof fetch = async (url, init) => {
      const response = await fetcher(url, init);
      const data = await response.json();
      if (data.type === "comment") data.text += "<p>[CLOSED]</p>";
      return Response.json(data);
    };
    await assert.rejects(
      saveDiscoveredOpportunity(itemId, input, closedFetcher),
      /not a current/,
    );
  } finally {
    if (ids.length)
      await db.delete(opportunities).where(inArray(opportunities.id, ids));
    if (campaignId)
      await db.delete(campaigns).where(eq(campaigns.id, campaignId));
    await (
      globalThis as unknown as { leadSql: { end(): Promise<void> } }
    ).leadSql.end();
  }
});
