import { config } from "dotenv";
config({ path: ".env", quiet: true });
import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "../../src/db";
import {
  campaigns,
  opportunities,
  leads,
  outreachDrafts,
} from "../../src/db/schema";
import {
  createCampaign,
  writeOpportunity,
  retrieveOpportunity,
  linkOpportunityLead,
} from "../../src/features/opportunities/mutations";
import {
  getOpportunity,
  listOpportunities,
} from "../../src/features/opportunities/queries";
import { analyzeOpportunity } from "../../src/features/opportunities/analysis";
import type { RetrievalDependencies } from "../../src/features/opportunities/retrieval";

test("Neon opportunity intake, evidence provenance, campaign worklist, dedup and lead/draft preservation", async () => {
  const db = getDb();
  const marker = `verification-${crypto.randomUUID()}`;
  const opportunityIds: string[] = [],
    leadIds: string[] = [];
  let campaignId: string | undefined;
  const input = {
    companyName: "",
    sourceUrl: `https://example.com/${marker}`,
    platform: "Synthetic test source",
    observedNeed: "",
    operatorEvidence: "",
    contactName: "",
    contactEmail: "",
    targetService: "",
    campaignId: "",
    decisionMakerEvidence: "",
    explicitRequest: "no",
    needDate: "",
    followUpDate: "",
  };
  try {
    const campaign = await createCampaign(marker);
    campaignId = campaign.id;
    assert.equal((await createCampaign(marker)).id, campaign.id);
    const saved = await writeOpportunity(null, { ...input, campaignId });
    opportunityIds.push(saved.id);
    assert.equal(saved.companyName, null);
    assert.equal(saved.retrievedAt, null);
    assert.equal((await getOpportunity(saved.id)).sourceUrl, input.sourceUrl);
    await assert.rejects(
      writeOpportunity(null, {
        ...input,
        sourceUrl: input.sourceUrl + "?utm_source=duplicate#fragment",
      }),
    );
    await assert.rejects(retrieveOpportunity(saved.id, false), /Confirm/);
    const edited = await writeOpportunity(saved.id, {
      ...input,
      campaignId,
      companyName: marker,
      operatorEvidence: "Operator excerpt must stay intact.",
      observedNeed: "Scheduling to CRM integration request",
      explicitRequest: "yes",
    });
    const deps: RetrievalDependencies = {
      resolve: async () => [{ address: "93.184.216.34", family: 4 }],
      read: async (url) =>
        url.pathname === "/robots.txt"
          ? {
              status: 200,
              headers: { "content-type": "text/plain" },
              body: "User-agent: *\nAllow: /",
            }
          : {
              status: 200,
              headers: { "content-type": "text/html" },
              body: "<main><p>We are looking for technical help connecting scheduling and our CRM system.</p></main>",
            },
    };
    const retrieved = await retrieveOpportunity(edited.id, true, deps);
    assert.ok(retrieved.retrievedAt);
    assert.match(retrieved.retrievedEvidence!, /technical help/);
    assert.equal(retrieved.operatorEvidence, edited.operatorEvidence);
    await assert.rejects(
      retrieveOpportunity(edited.id, true, {
        ...deps,
        read: async () => ({ status: 403, headers: {}, body: "" }),
      }),
      /Robots/,
    );
    const afterFailure = await getOpportunity(edited.id);
    assert.equal(afterFailure.retrievalStatus, "manual_only");
    assert.equal(
      afterFailure.retrievedAt?.toISOString(),
      retrieved.retrievedAt?.toISOString(),
    );
    assert.equal(afterFailure.operatorEvidence, edited.operatorEvidence);
    const oldEnabled = process.env.AI_ENABLED;
    process.env.AI_ENABLED = "false";
    try {
      await assert.rejects(
        analyzeOpportunity(retrieved, "retrieved"),
        /disabled/,
      );
    } finally {
      if (oldEnabled === undefined) delete process.env.AI_ENABLED;
      else process.env.AI_ENABLED = oldEnabled;
    }
    await assert.rejects(analyzeOpportunity(saved, "retrieved"), /evidence/);
    const plan = {
      service: "automation",
      evidenceField: "problemEvidence",
      evidenceQuote:
        "We are looking for technical help connecting scheduling and our CRM system.",
      nextAction: "verify_need",
    };
    const env = process.env.AI_ENABLED;
    const base = process.env.AI_BASE_URL;
    process.env.AI_ENABLED = "true";
    process.env.AI_BASE_URL = "http://127.0.0.1:8080/v1";
    const fetch = mock.method(globalThis, "fetch", async () =>
      Response.json({
        choices: [
          { finish_reason: "stop", message: { content: JSON.stringify(plan) } },
        ],
      }),
    );
    try {
      const analysis = await analyzeOpportunity(retrieved, "retrieved");
      assert.equal(analysis.origin, "retrieved");
      assert.equal(analysis.explicitNeedQuote, plan.evidenceQuote);
      assert.ok(analysis.missing.includes("contact email"));
    } finally {
      fetch.mock.restore();
      if (env === undefined) delete process.env.AI_ENABLED;
      else process.env.AI_ENABLED = env;
      if (base === undefined) delete process.env.AI_BASE_URL;
      else process.env.AI_BASE_URL = base;
    }
    const email = `${marker}@example.com`;
    const [existing] = await db
      .insert(leads)
      .values({
        companyName: marker,
        contactEmail: email.toUpperCase(),
        notes: "Existing notes must not be replaced",
        qualificationScore: 0,
      })
      .returning();
    leadIds.push(existing.id);
    const [draft] = await db
      .insert(outreachDrafts)
      .values({
        leadId: existing.id,
        channel: "email",
        subject: "Existing draft",
        body: "Existing draft body unchanged",
      })
      .returning();
    await writeOpportunity(saved.id, {
      ...input,
      campaignId,
      companyName: marker,
      contactEmail: email,
    });
    const linked = await linkOpportunityLead(saved.id);
    assert.equal(linked.leadId, existing.id);
    assert.equal(linked.existing, true);
    assert.equal(
      (await db.select().from(leads).where(eq(leads.id, existing.id)))[0].notes,
      existing.notes,
    );
    assert.equal(
      (
        await db
          .select()
          .from(outreachDrafts)
          .where(eq(outreachDrafts.id, draft.id))
      )[0].body,
      draft.body,
    );
    assert.equal(
      (await getOpportunity(saved.id)).retrievedAt?.toISOString(),
      retrieved.retrievedAt?.toISOString(),
    );
    const reset = await writeOpportunity(saved.id, {
      ...input,
      campaignId,
      sourceUrl: input.sourceUrl + "/changed",
    });
    assert.equal(reset.retrievedAt, null);
    assert.equal(reset.retrievedEvidence, null);
    const pending = await writeOpportunity(null, {
      ...input,
      sourceUrl: input.sourceUrl + "/due",
      campaignId,
      companyName: marker + "-due",
      followUpDate: "2020-01-01",
    });
    opportunityIds.push(pending.id);
    assert.equal((await listOpportunities(campaignId))[0].id, pending.id);
    const [promoted, concurrent] = await Promise.all([
      linkOpportunityLead(pending.id),
      linkOpportunityLead(pending.id),
    ]);
    assert.equal(concurrent.leadId, promoted.leadId);
    leadIds.push(promoted.leadId);
    assert.equal(
      (await linkOpportunityLead(pending.id)).leadId,
      promoted.leadId,
    );
    assert.equal(
      (await db.select().from(leads).where(eq(leads.id, promoted.leadId)))[0]
        .status,
      "new",
    );
    const incomplete = await writeOpportunity(null, {
      ...input,
      sourceUrl: input.sourceUrl + "/incomplete",
      campaignId,
    });
    opportunityIds.push(incomplete.id);
    await assert.rejects(linkOpportunityLead(incomplete.id), /company/);
  } finally {
    mock.restoreAll();
    if (opportunityIds.length)
      await db
        .delete(opportunities)
        .where(inArray(opportunities.id, opportunityIds));
    if (leadIds.length)
      await db.delete(leads).where(inArray(leads.id, leadIds));
    if (campaignId)
      await db.delete(campaigns).where(eq(campaigns.id, campaignId));
    await (
      globalThis as unknown as { leadSql: { end(): Promise<void> } }
    ).leadSql.end();
  }
});
