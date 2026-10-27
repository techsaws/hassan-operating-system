import "server-only";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { outreachDrafts } from "@/db/schema";
export function listDrafts(leadId: string) {
  return getDb()
    .select()
    .from(outreachDrafts)
    .where(eq(outreachDrafts.leadId, leadId))
    .orderBy(desc(outreachDrafts.updatedAt));
}
