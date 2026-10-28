import { config } from "dotenv";
config({ path: ".env", quiet: true });
import { test } from "node:test";
import assert from "node:assert/strict";
import { eq, inArray, count } from "drizzle-orm";
import { getDb } from "../../src/db";
import {
  acquisitionEntities,
  acquisitionFindings,
  leads,
  opportunities,
  outreachDrafts,
  campaigns,
} from "../../src/db/schema";
import { persistFinding } from "../../src/features/acquisition/store";
import { normalizeRemotive } from "../../src/features/acquisition/normalize";
import { syntheticJob } from "../fixtures/acquisition";
import { normalizeAgency } from "../../src/features/acquisition/agencies";
import { saveAgencyResearch } from "../../src/features/acquisition/agency-handoff";
import { createCampaign } from "../../src/features/opportunities/mutations";
test("Neon selected findings deduplicate identities without merging openings/pipelines or changing CRM/research/drafts", async () => {
  const db = getDb(),
    marker = crypto.randomUUID(),
    ids: string[] = [],
    entityIds = new Set<string>();
  const legacyIds: string[] = [];
  let campaignId: string | undefined;
  const stats = async () =>
    Promise.all([
      db.select({ n: count() }).from(leads),
      db.select({ n: count() }).from(opportunities),
      db.select({ n: count() }).from(outreachDrafts),
    ]);
  const before = await stats();
  try {
    const a = normalizeRemotive(
      {
        ...syntheticJob,
        id: 700000000000 + Math.floor(Math.random() * 100000000),
        company_name: "Synthetic " + marker,
        url: `https://remotive.com/remote-jobs/software-development/synthetic-${marker}`,
      },
      new Date().toISOString(),
    );
    // A real provider ID, where supplied, can link distinct openings. Display names alone cannot.
    a.identity!.providerId = "verified-synthetic-employer-" + marker;
    const first = await persistFinding(a, "job");
    ids.push(first.id);
    await assert.rejects(persistFinding(a, "client"), /Job postings/);
    const duplicate = await persistFinding(
      { ...a, title: "Do not overwrite existing selected evidence" },
      "job",
    );
    assert.equal(first.id, duplicate.id);
    assert.equal(duplicate.existing, true);
    const [original] = await db
      .select()
      .from(acquisitionFindings)
      .where(eq(acquisitionFindings.id, first.id));
    entityIds.add(original.entityId!);
    assert.equal(original.data.title, a.title);
    assert.equal(original.pipeline, "job");
    const second = await persistFinding(
      {
        ...a,
        sourceId: a.sourceId + "2",
        url: a.url + "-another",
        title: "Another opening",
      },
      "job",
    );
    ids.push(second.id);
    const [two] = await db
      .select()
      .from(acquisitionFindings)
      .where(eq(acquisitionFindings.id, second.id));
    assert.equal(two.entityId, original.entityId);
    const unresolved1 = await persistFinding(
      {
        ...a,
        sourceId: a.sourceId + "unresolved1",
        url: a.url + "-unresolved1",
        identity: { ...a.identity!, providerId: null },
      },
      "job",
    );
    ids.push(unresolved1.id);
    const unresolved2 = await persistFinding(
      {
        ...a,
        sourceId: a.sourceId + "unresolved2",
        url: a.url + "-unresolved2",
        identity: { ...a.identity!, providerId: null },
      },
      "job",
    );
    ids.push(unresolved2.id);
    const unresolved = await db
      .select()
      .from(acquisitionFindings)
      .where(inArray(acquisitionFindings.id, [unresolved1.id, unresolved2.id]));
    assert.notEqual(unresolved[0].entityId, unresolved[1].entityId);
    for (const row of unresolved) entityIds.add(row.entityId!);
    const domain = marker + ".example.com";
    const business = {
      ...a,
      provider: "overture" as const,
      sourceId: marker,
      pipeline: "research" as const,
      demand: "hypothesis" as const,
      url: `https://${domain}/`,
      identity: {
        kind: "organization" as const,
        name: "Business " + marker,
        domain,
        providerId: marker,
      },
      arrangements: ["unknown" as const],
    };
    const b = await persistFinding(business, "client");
    ids.push(b.id);
    const partner = await persistFinding(
      {
        ...business,
        provider: "hn",
        sourceId: marker + "2",
        url: `https://${domain}/partnership`,
        identity: { ...business.identity, providerId: "other-provider-id" },
      },
      "partnership",
    );
    ids.push(partner.id);
    const [br, pr] = await Promise.all([
      db
        .select()
        .from(acquisitionFindings)
        .where(eq(acquisitionFindings.id, b.id)),
      db
        .select()
        .from(acquisitionFindings)
        .where(eq(acquisitionFindings.id, partner.id)),
    ]);
    assert.equal(br[0].entityId, pr[0].entityId);
    entityIds.add(br[0].entityId!);
    assert.equal(br[0].pipeline, "client");
    assert.equal(pr[0].pipeline, "partnership");
    assert.equal(pr[0].data.demand, "hypothesis");
    const alias = await persistFinding(
      { ...business, provider: "hn", sourceId: marker + "alias" },
      "research",
    );
    assert.equal(alias.id, b.id);
    const aliasMoved = await persistFinding(
      {
        ...business,
        provider: "hn",
        sourceId: marker + "alias",
        url: `https://${domain}/moved`,
      },
      "research",
    );
    assert.equal(aliasMoved.id, b.id);
    const [kept] = await db
      .select()
      .from(acquisitionFindings)
      .where(eq(acquisitionFindings.id, b.id));
    assert.equal(kept.pipeline, "client");
    assert.equal(kept.aliases.length, 2);
    const withoutWebsite = {
      ...business,
      url: "https://stac.overturemaps.org/catalog.json",
      urlKind: "catalogue" as const,
      route: null,
      identity: {
        ...business.identity,
        domain: null,
        providerId: marker + "no-site",
      },
    };
    const noSite = await persistFinding(
      { ...withoutWebsite, sourceId: marker + "no-site" },
      "research",
    );
    ids.push(noSite.id);
    const otherNoSite = await persistFinding(
      {
        ...withoutWebsite,
        sourceId: marker + "different-site",
        identity: {
          ...withoutWebsite.identity,
          name: "Unrelated synthetic business",
          providerId: marker + "different-site",
        },
      },
      "research",
    );
    ids.push(otherNoSite.id);
    assert.notEqual(noSite.id, otherNoSite.id);
    for (const row of await db
      .select()
      .from(acquisitionFindings)
      .where(inArray(acquisitionFindings.id, [noSite.id, otherNoSite.id])))
      entityIds.add(row.entityId!);
    assert.equal(
      (
        await persistFinding(
          { ...withoutWebsite, sourceId: marker + "no-site" },
          "research",
        )
      ).id,
      noSite.id,
    );
    const applicationTarget = `https://${marker}.example.com/careers/opening-1`;
    const boardJob = {
      ...a,
      sourceId: a.sourceId + "shared-opening",
      url: a.url + "-shared-opening",
      applicationTarget,
      excerpt: a.excerpt + "\nApply at " + applicationTarget,
    };
    const board = await persistFinding(boardJob, "job");
    ids.push(board.id);
    const cross = await persistFinding(
      {
        ...boardJob,
        provider: "remoteok",
        sourceId: "799" + a.sourceId,
        url: "https://remoteok.com/remote-jobs/synthetic-" + marker,
      },
      "job",
    );
    assert.equal(cross.id, board.id);
    assert.equal(cross.existing, true);
    await assert.rejects(
      persistFinding({ ...boardJob, provider: "remoteok" }, "partnership"),
      /Job postings/,
    );
    campaignId = (await createCampaign("Synthetic agency " + marker)).id;
    const agency = normalizeAgency(
      {
        slug: "synthetic-" + marker,
        name: "Synthetic Agency " + marker,
        tagline: "Web development",
        location: { country: "United States", city: "Synthetic City" },
        services: ["Web Development"],
        team_size: "11-50",
        website: `https://${marker}-agency.example.com`,
        profile_url:
          "https://www.pickanagency.com/agencies/synthetic-" + marker,
      },
      new Date().toISOString(),
    );
    const legacy = await saveAgencyResearch(agency, campaignId);
    legacyIds.push(legacy);
    await db
      .update(opportunities)
      .set({ operatorEvidence: "Existing manual agency research" })
      .where(eq(opportunities.id, legacy));
    assert.equal(await saveAgencyResearch(agency, campaignId), legacy);
    const [research] = await db
      .select()
      .from(opportunities)
      .where(eq(opportunities.id, legacy));
    assert.equal(research.operatorEvidence, "Existing manual agency research");
    assert.equal(research.leadId, null);
    assert.equal(research.observedNeed, null);
    assert.equal(research.explicitRequest, 0);
    await db.delete(opportunities).where(eq(opportunities.id, legacy));
    assert.deepEqual(await stats(), before);
  } finally {
    if (legacyIds.length)
      await db
        .delete(opportunities)
        .where(inArray(opportunities.id, legacyIds));
    if (campaignId)
      await db.delete(campaigns).where(eq(campaigns.id, campaignId));
    if (ids.length)
      await db
        .delete(acquisitionFindings)
        .where(inArray(acquisitionFindings.id, ids));
    if (entityIds.size)
      await db
        .delete(acquisitionEntities)
        .where(inArray(acquisitionEntities.id, [...entityIds]));
    await (
      globalThis as unknown as { leadSql: { end(): Promise<void> } }
    ).leadSql.end();
  }
});
