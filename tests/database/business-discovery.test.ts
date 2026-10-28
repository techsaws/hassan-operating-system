import { config } from "dotenv";
config({ path: ".env", quiet: true });
import { test } from "node:test";
import assert from "node:assert/strict";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "../../src/db";
import { campaigns, opportunities } from "../../src/db/schema";
import { createCampaign } from "../../src/features/opportunities/mutations";
import { discoverBusinesses } from "../../src/features/discovery/business-source";
import { saveBusiness } from "../../src/features/discovery/business-save";
import { assessOpportunity } from "../../src/features/opportunities/assessment";
test("business snapshot saves to Neon with provenance, no fabricated need or CRM lead, and preserves duplicate research", async () => {
  const db = getDb(),
    marker = `verification-business-${crypto.randomUUID()}`,
    ids: string[] = [];
  let campaignId: string | undefined;
  try {
    campaignId = (await createCampaign(marker)).id;
    const a = crypto.randomUUID(),
      b = crypto.randomUUID(),
      c = crypto.randomUUID();
    const row = {
      id: a,
      name: marker,
      category: "plumbing",
      city: "Synthetic City",
      region: "NC",
      country: "US",
      websites: [`https://${marker}.example.com/`],
      phones: ["+12025550100"],
      confidence: 0.8,
      status: "open",
      sources: [{ dataset: "Synthetic", license: "CC0-1.0", updateTime: null }],
    };
    const report = await discoverBusinesses(
      { area: "raleigh", trade: "all" },
      async () => ({
        release: "2026-10-21.0",
        scanned: 3,
        limited: false,
        businesses: [
          row,
          { ...row, id: b, websites: [] },
          { ...row, id: c, websites: [`http://www.${marker}.example.com/`] },
        ],
      }),
    );
    const saved = await saveBusiness(report.token, a, campaignId);
    ids.push(saved.id);
    const [o] = await db
      .select()
      .from(opportunities)
      .where(eq(opportunities.id, saved.id));
    assert.equal(o.companyName, marker);
    assert.equal(o.leadId, null);
    assert.equal(o.operatorEvidence, null);
    assert.equal(o.observedNeed, null);
    assert.equal(o.explicitRequest, 0);
    assert.equal(o.contactEmail, null);
    assert.match(o.retrievedEvidence!, /not established/);
    assert.match(o.retrievedEvidence!, /GERS/);
    assert.match(o.retrievedUrl!, /collections.parquet/);
    assert.equal(assessOpportunity(o).readiness, "Research needed");
    assert.equal(assessOpportunity(o).priority, 0);
    await db
      .update(opportunities)
      .set({ operatorEvidence: "Manual research must survive" })
      .where(eq(opportunities.id, saved.id));
    const again = await saveBusiness(report.token, a, campaignId);
    assert.equal(again.id, saved.id);
    assert.equal(again.existing, true);
    const alias = await saveBusiness(report.token, c, campaignId);
    assert.equal(alias.id, saved.id);
    assert.equal(alias.existing, true);
    assert.equal(
      (
        await db
          .select()
          .from(opportunities)
          .where(eq(opportunities.id, saved.id))
      )[0].operatorEvidence,
      "Manual research must survive",
    );
    const empty = await Promise.all([
      saveBusiness(report.token, b, campaignId),
      saveBusiness(report.token, b, campaignId),
    ]);
    ids.push(empty[0].id);
    assert.equal(empty[0].id, empty[1].id);
    assert.equal(
      (
        await db
          .select()
          .from(opportunities)
          .where(eq(opportunities.id, empty[0].id))
      )[0].sourceUrl,
      null,
    );
    await assert.rejects(
      saveBusiness(report.token, crypto.randomUUID(), campaignId),
      /expired/,
    );
    await assert.rejects(
      saveBusiness(report.token, a, crypto.randomUUID()),
      /existing campaign/,
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
