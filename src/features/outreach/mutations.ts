import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { leads, outreachDrafts } from "@/db/schema";
import { draftInput } from "./validation";
export async function writeDraft(input: unknown) {
  const data = draftInput.parse(input);
  const db = getDb();
  const [lead] = await db
    .select({ id: leads.id })
    .from(leads)
    .where(eq(leads.id, data.leadId))
    .limit(1);
  if (!lead) throw new Error("Lead no longer exists.");
  const { id, ...values } = data;
  const savedValues = {
    ...values,
    subject: data.channel === "email" ? data.subject : null,
  };
  if (!id)
    return (await db.insert(outreachDrafts).values(savedValues).returning())[0];
  const [saved] = await db
    .update(outreachDrafts)
    .set({ ...savedValues, updatedAt: new Date() })
    .where(
      and(eq(outreachDrafts.id, id), eq(outreachDrafts.leadId, data.leadId)),
    )
    .returning();
  if (!saved) throw new Error("Draft not found for this lead.");
  return saved;
}
