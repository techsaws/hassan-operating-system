import { config } from "dotenv";
config({ path: ".env", quiet: true });
import { test } from "node:test";
import assert from "node:assert/strict";
import { eq, like } from "drizzle-orm";
import { getDb } from "../../src/db";
import { leads } from "../../src/db/schema";
import { writeLead } from "../../src/features/leads/mutations";
import {
  getLead,
  listLeads,
  leadCounts,
} from "../../src/features/leads/queries";
import { leadInput } from "../../src/features/leads/validation";
import { processImport } from "../../src/features/leads/import-service";
import { parseCsv, suggestMapping } from "../../src/features/leads/csv";

test("Neon workflow: mutations, qualification, import, dedup, sorting, preservation and rollback", async () => {
  const db = getDb();
  const marker = `verification-${crypto.randomUUID()}`;
  const base = {
    companyName: marker,
    websiteUrl: "",
    contactName: "",
    contactEmail: `${marker}@example.com`,
    country: "",
    source: "",
    serviceInterest: "",
    status: "new",
    notes: "Keep existing notes",
    nextFollowUp: "",
  };
  try {
    const before = (await leadCounts()).reduce((n, r) => n + r.count, 0);
    const created = await writeLead(null, leadInput.parse(base));
    assert.equal((await getLead(created.id)).qualificationScore, 0);
    const csv = `Company Name,Contact Email,Notes\n${marker}-existing,${base.contactEmail.toUpperCase()},Overwrite attempt\n${marker}-fresh,new-${base.contactEmail},Fresh\n${marker}-duplicate,NEW-${base.contactEmail.toUpperCase()},Duplicate\n${marker}-bad,bad,Invalid\n${marker}-blank1,,Empty\n${marker}-blank2,,Empty`;
    const mapping = suggestMapping(parseCsv(csv).headers);
    const preview = await processImport(csv, mapping);
    assert.equal(preview.valid, 3);
    assert.equal(preview.invalid, 1);
    assert.equal(preview.skipped, 2);
    assert.equal(preview.imported, 0);
    assert.equal((await listLeads(marker)).length, 1, "preview must not write");
    const report = await processImport(csv, mapping, true);
    assert.equal(report.imported, 3);
    assert.equal(report.invalid, 1);
    assert.equal(report.skipped, 2);
    assert.equal(
      report.imported + report.invalid + report.skipped,
      report.total,
    );
    assert.equal((await getLead(created.id)).notes, "Keep existing notes");
    assert.equal((await getLead(created.id)).companyName, marker);
    assert.equal((await listLeads(marker)).length, 4);
    assert.equal(
      (await leadCounts()).reduce((n, r) => n + r.count, 0),
      before + 4,
    );
    await writeLead(
      created.id,
      leadInput.parse({
        ...base,
        status: "qualified",
        targetService: "backend",
        problemEvidence: "Test observation",
        serviceFitEvidence: "Test fit",
        evidenceUrl: "https://example.com/test-evidence",
      }),
    );
    const edited = await getLead(created.id);
    assert.equal(edited.qualificationScore, 50);
    assert.ok(edited.lastReviewedAt);
    assert.match(edited.qualificationExplanation, /Business need: 30/);
    assert.equal((await listLeads(marker, "", "score"))[0].id, created.id);
    assert.equal((await listLeads(marker, "qualified", "score")).length, 1);
    assert.equal(
      (await listLeads(marker, "", "newest"))[0].qualificationScore,
      0,
    );
    assert.ok(
      (await listLeads(base.contactEmail)).some((l) => l.id === created.id),
    );
    await assert.rejects(
      writeLead(
        null,
        leadInput.parse({
          ...base,
          contactEmail: base.contactEmail.toUpperCase(),
        }),
      ),
    );
    // Re-import of a nonempty email is idempotent, and existing records stay intact.
    const repeat = `Company,Email\n${marker}-retry,new-${base.contactEmail}`;
    const repeated = await processImport(
      repeat,
      suggestMapping(parseCsv(repeat).headers),
      true,
    );
    assert.equal(repeated.imported, 0);
    assert.equal(repeated.skipped, 1);
    await assert.rejects(
      db.transaction(async (tx) => {
        await tx.insert(leads).values({ companyName: `${marker}-rollback` });
        throw new Error("deliberate test rollback");
      }),
      /deliberate test rollback/,
    );
    assert.equal((await listLeads(`${marker}-rollback`)).length, 0);
    // Empty emails do not collide; same-email edits succeed; removing evidence resets score.
    await writeLead(created.id, leadInput.parse(base));
    assert.equal((await getLead(created.id)).qualificationScore, 0);
    assert.equal((await getLead(created.id)).lastReviewedAt, null);
  } finally {
    await db.delete(leads).where(like(leads.companyName, `${marker}%`));
    assert.equal(
      (await db.select().from(leads).where(eq(leads.companyName, marker)))
        .length,
      0,
    );
    await (
      globalThis as unknown as { leadSql: { end(): Promise<void> } }
    ).leadSql.end();
  }
});
