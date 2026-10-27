import { config } from "dotenv";
config({ path: ".env", quiet: true });
import { test } from "node:test";
import assert from "node:assert/strict";
import { inArray } from "drizzle-orm";
import { getDb } from "../../src/db";
import { leads } from "../../src/db/schema";
import { writeDraft } from "../../src/features/outreach/mutations";
import { listDrafts } from "../../src/features/outreach/queries";

test("outreach drafts persist, edit in place, isolate leads, and cascade cleanly", async () => {
  const db = getDb();
  const marker = `verification-outreach-${crypto.randomUUID()}`;
  const ids: string[] = [];
  try {
    const created = await db
      .insert(leads)
      .values([{ companyName: marker }, { companyName: marker + "-other" }])
      .returning({ id: leads.id });
    ids.push(...created.map((c) => c.id));
    const draft = await writeDraft({
      id: null,
      leadId: ids[0],
      channel: "email",
      subject: "Test subject",
      body: "Disposable test draft. No message sent.",
    });
    assert.equal((await listDrafts(ids[0])).length, 1);
    const edited = await writeDraft({
      id: draft.id,
      leadId: ids[0],
      channel: "email",
      subject: "Edited subject",
      body: "Updated disposable draft.",
    });
    assert.equal(edited.id, draft.id);
    assert.equal(edited.createdAt.toISOString(), draft.createdAt.toISOString());
    assert.equal(
      (await listDrafts(ids[0]))[0].body,
      "Updated disposable draft.",
    );
    await assert.rejects(
      writeDraft({
        id: draft.id,
        leadId: ids[1],
        channel: "email",
        subject: "Wrong lead",
        body: "Must not overwrite.",
      }),
      /not found/,
    );
    assert.equal((await listDrafts(ids[0]))[0].subject, "Edited subject");
    const linkedin = await writeDraft({
      id: null,
      leadId: ids[0],
      channel: "linkedin",
      subject: "Discard this",
      body: "Disposable LinkedIn draft.",
    });
    assert.equal(linkedin.subject, null);
    await assert.rejects(
      writeDraft({
        id: null,
        leadId: ids[0],
        channel: "email",
        subject: "",
        body: "No subject",
      }),
    );
    await db.delete(leads).where(inArray(leads.id, ids));
    assert.equal((await listDrafts(ids[0])).length, 0);
  } finally {
    if (ids.length) await db.delete(leads).where(inArray(leads.id, ids));
    await (
      globalThis as unknown as { leadSql: { end(): Promise<void> } }
    ).leadSql.end();
  }
});
