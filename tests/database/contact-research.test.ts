import { config } from "dotenv";
config({ path: ".env", quiet: true });
import { test } from "node:test";
import assert from "node:assert/strict";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "../../src/db";
import { opportunities, leads, outreachDrafts } from "../../src/db/schema";
import {
  recordManualContactSource,
  annotateContactSource,
  researchContact,
} from "../../src/features/opportunities/contact-research";
import { writeOpportunity } from "../../src/features/opportunities/mutations";
import { saveReviewedApproachDraft } from "../../src/features/opportunities/approach";
import { blankAnnotation } from "../../src/features/opportunities/contact-types";
test("Neon contact research preserves original evidence, distinguishes origins, gates drafts, and hands off reviewed contact without a fabricated problem", async () => {
  const db = getDb(),
    marker = `verification-contact-${crypto.randomUUID()}`;
  let id: string | undefined, leadId: string | undefined;
  try {
    const [o] = await db
      .insert(opportunities)
      .values({
        companyName: marker,
        sourceUrl: "https://example.com",
        operatorEvidence: "Original manual evidence",
        retrievedEvidence: "Original catalogue evidence",
      })
      .returning();
    id = o.id;
    const excerpt =
      "Test Owner runs the business. Vendor inquiries: vendor@example.com. We call after service requests arrive.";
    let saved = await recordManualContactSource(
      id,
      "https://example.com/contact",
      excerpt,
    );
    const source = saved.contactResearch!.sources[0];
    assert.equal(source.origin, "operator");
    saved = await recordManualContactSource(
      id,
      "https://example.com/contact",
      excerpt,
    );
    assert.equal(saved.contactResearch!.sources.length, 1);
    await assert.rejects(
      researchContact(id, "http://127.0.0.1/", false),
      /Confirm/,
    );
    saved = await researchContact(id, "https://example.com/about", true, {
      resolve: async () => [{ address: "8.8.8.8", family: 4 }],
      read: async (_url, _address, _signal, _max, kind) => ({
        status: 200,
        headers: {
          "content-type": kind === "robots" ? "text/plain" : "text/html",
        },
        body:
          kind === "robots"
            ? "User-agent: *\nAllow: /"
            : "<p>Our team reviews requests and calls customers to schedule appointments.</p>",
      }),
    });
    assert.equal(saved.contactResearch!.sources[1].origin, "retrieved");
    assert.equal(saved.operatorEvidence, "Original manual evidence");
    assert.equal(saved.retrievedEvidence, "Original catalogue evidence");
    assert.equal(saved.contactName, null);
    await assert.rejects(
      saveReviewedApproachDraft(id, "Subject", "Body", true),
      /appropriate business email/,
    );
    await annotateContactSource(id, source.id, {
      ...blankAnnotation,
      routeKind: "customer_booking",
      route: "https://example.com/contact",
      routeQuote: "We call after service requests arrive.",
      routePurpose: "b2b_explicit",
      reviewed: true,
    });
    await assert.rejects(
      saveReviewedApproachDraft(id, "Subject", "Body", true),
      /appropriate business email/,
    );
    saved = await annotateContactSource(id, source.id, {
      ...blankAnnotation,
      name: "Test Owner",
      role: "Owner",
      roleQuote: "Test Owner runs the business.",
      routeKind: "email",
      route: "vendor@example.com",
      routeQuote: "Vendor inquiries: vendor@example.com.",
      routePurpose: "b2b_explicit",
      workflowQuote: "We call after service requests arrive.",
      reviewed: true,
    });
    assert.equal(saved.contactResearch!.sources.length, 2);
    await assert.rejects(
      saveReviewedApproachDraft(id, "Subject", "Body", false),
      /approve saving/,
    );
    const draft = await saveReviewedApproachDraft(
      id,
      "Reviewed subject",
      "Short reviewed internal email. Nothing sent.",
      true,
    );
    leadId = draft.leadId;
    const [l] = await db.select().from(leads).where(eq(leads.id, leadId));
    assert.equal(l.contactEmail, "vendor@example.com");
    assert.equal(l.contactName, "Test Owner");
    assert.equal(l.problemEvidence, null);
    assert.equal(l.buyingSignalEvidence, null);
    assert.equal(l.qualificationScore, 0);
    assert.match(l.serviceFitEvidence!, /call after/);
    assert.equal(
      (
        await db
          .select()
          .from(outreachDrafts)
          .where(eq(outreachDrafts.id, draft.draftId))
      )[0].body,
      "Short reviewed internal email. Nothing sent.",
    );
    await db
      .update(leads)
      .set({ contactEmail: "different@example.com" })
      .where(eq(leads.id, leadId));
    await assert.rejects(
      saveReviewedApproachDraft(id, "Subject", "Body", true),
      /linked CRM email/,
    );
    await db
      .update(leads)
      .set({ contactEmail: "vendor@example.com" })
      .where(eq(leads.id, leadId));
    await annotateContactSource(id, source.id, {
      ...blankAnnotation,
      reviewed: true,
    });
    await assert.rejects(
      saveReviewedApproachDraft(id, "Subject", "Body", true),
      /appropriate business email/,
    );
    assert.equal(
      (
        await db
          .select()
          .from(outreachDrafts)
          .where(eq(outreachDrafts.id, draft.draftId))
      )[0].subject,
      "Reviewed subject",
    );
    const changed = await writeOpportunity(id, {
      companyName: marker + " changed",
      sourceUrl: "https://example.com",
      platform: "Synthetic",
      contactName: "",
      contactEmail: "",
      observedNeed: "",
      operatorEvidence: "Original manual evidence",
      targetService: "automation",
      campaignId: "",
      decisionMakerEvidence: "",
      explicitRequest: "no",
      needDate: "",
      followUpDate: "",
    });
    assert.equal(changed.contactResearch, null);
  } finally {
    if (id) await db.delete(opportunities).where(eq(opportunities.id, id));
    if (leadId) await db.delete(leads).where(inArray(leads.id, [leadId]));
    await (
      globalThis as unknown as { leadSql: { end(): Promise<void> } }
    ).leadSql.end();
  }
});
