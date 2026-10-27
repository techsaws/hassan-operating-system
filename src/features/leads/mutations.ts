import "server-only";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import { getDb } from "@/db";
import { leads } from "@/db/schema";
import type { leadInput } from "./validation";
import { qualifyLead } from "./qualification";

export async function writeLead(
  id: string | null,
  data: z.output<typeof leadInput>,
) {
  const reviewed = Boolean(
    data.targetService ||
    data.problemEvidence ||
    data.evidenceUrl ||
    data.serviceFitEvidence ||
    data.contactRelevanceEvidence ||
    data.reachabilityEvidence ||
    data.buyingSignalEvidence ||
    data.buyingSignalUrl,
  );
  const values = {
    ...data,
    ...qualifyLead(data),
    lastReviewedAt: reviewed ? new Date() : null,
  };
  if (!id)
    return (
      await getDb().insert(leads).values(values).returning({ id: leads.id })
    )[0];
  return (
    await getDb()
      .update(leads)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning({ id: leads.id })
  )[0];
}
