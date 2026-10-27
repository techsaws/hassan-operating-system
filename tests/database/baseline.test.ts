import { config } from "dotenv";
config({ path: ".env", quiet: true });
import { test } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { getDb } from "../../src/db";
import { leads } from "../../src/db/schema";
import {
  getLead,
  listLeads,
  leadCounts,
} from "../../src/features/leads/queries";
import { leadInput } from "../../src/features/leads/validation";

test("Neon baseline: create, persist, edit, search, filter, deduplicate, counts", async () => {
  const db = getDb();
  const marker = `verification-${crypto.randomUUID()}`;
  const email = `${marker}@example.com`;
  let id: string | undefined;
  try {
    const before = (await leadCounts()).reduce((n, r) => n + r.count, 0);
    const [created] = await db
      .insert(leads)
      .values({ companyName: marker, contactName: marker, contactEmail: email })
      .returning();
    id = created.id;
    assert.equal((await getLead(id)).companyName, marker);
    assert.equal(
      (await leadCounts()).reduce((n, r) => n + r.count, 0),
      before + 1,
    );
    await db
      .update(leads)
      .set({
        status: "qualified",
        notes: "Persistence verified",
        updatedAt: new Date(),
      })
      .where(eq(leads.id, id));
    assert.equal((await getLead(id)).notes, "Persistence verified");
    assert.ok((await listLeads(marker, "qualified")).some((l) => l.id === id));
    assert.ok((await listLeads(email, "")).some((l) => l.id === id));
    assert.ok(!(await listLeads(marker, "lost")).some((l) => l.id === id));
    await assert.rejects(
      db
        .insert(leads)
        .values({ companyName: marker, contactEmail: email.toUpperCase() }),
      (e) => {
        const error = e as { cause?: { code?: string } };
        return error.cause?.code === "23505";
      },
    );
    assert.equal(leadInput.safeParse({ companyName: "" }).success, false);
  } finally {
    if (id) await db.delete(leads).where(eq(leads.id, id));
    await (
      globalThis as unknown as { leadSql: { end(): Promise<void> } }
    ).leadSql.end();
  }
});
