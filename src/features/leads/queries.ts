import "server-only";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { getDb } from "@/db";
import { leads, statuses } from "@/db/schema";
export async function listLeads(search = "", status = "", sort = "newest") {
  const escaped = search.slice(0, 200).replace(/[\\%_]/g, "\\$&");
  return getDb()
    .select()
    .from(leads)
    .where(
      and(
        escaped
          ? or(
              ilike(leads.companyName, `%${escaped}%`),
              ilike(leads.contactName, `%${escaped}%`),
              ilike(leads.contactEmail, `%${escaped}%`),
            )
          : undefined,
        statuses.includes(status as (typeof statuses)[number])
          ? eq(leads.status, status as (typeof statuses)[number])
          : undefined,
      ),
    )
    .orderBy(
      ...(sort === "score"
        ? [
            desc(leads.qualificationScore),
            desc(leads.createdAt),
            desc(leads.id),
          ]
        : [desc(leads.createdAt), desc(leads.id)]),
    )
    .limit(500);
}
export async function getLead(id: string) {
  return (
    await getDb().select().from(leads).where(eq(leads.id, id)).limit(1)
  )[0];
}
export async function leadCounts() {
  return getDb()
    .select({ status: leads.status, count: count() })
    .from(leads)
    .groupBy(leads.status);
}
