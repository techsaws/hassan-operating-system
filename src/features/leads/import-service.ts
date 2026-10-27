import "server-only";
import { inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { leads } from "@/db/schema";
import { prepareCsv } from "./csv";
import { qualifyLead } from "./qualification";
import {
  importFields,
  type ImportReport,
  type ImportField,
} from "./import-fields";

export async function processImport(
  text: string,
  mapping: unknown,
  commit = false,
): Promise<ImportReport> {
  const plan = prepareCsv(text, mapping);
  const emails = plan.candidates.flatMap((c) =>
    c.data.contactEmail ? [c.data.contactEmail] : [],
  );
  const existing = emails.length
    ? await getDb()
        .select({ email: leads.contactEmail })
        .from(leads)
        .where(inArray(sql`lower(${leads.contactEmail})`, emails))
    : [];
  const existingEmails = new Set(existing.map((e) => e.email?.toLowerCase()));
  const fresh = plan.candidates.filter(
    (c) => !c.data.contactEmail || !existingEmails.has(c.data.contactEmail),
  );
  const issues = [
    ...plan.issues,
    ...plan.candidates
      .filter(
        (c) => c.data.contactEmail && existingEmails.has(c.data.contactEmail),
      )
      .map((c) => ({
        row: c.row,
        message: "Email already exists; existing lead unchanged.",
      })),
  ];
  let imported = 0;
  if (commit && fresh.length) {
    // All accepted records commit together. The unique index handles concurrent imports.
    imported = await getDb().transaction(async (tx) => {
      let count = 0;
      for (let offset = 0; offset < fresh.length; offset += 100) {
        const inserted = await tx
          .insert(leads)
          .values(
            fresh
              .slice(offset, offset + 100)
              .map((c) => ({ ...c.data, ...qualifyLead(c.data) })),
          )
          .onConflictDoNothing()
          .returning({ id: leads.id });
        count += inserted.length;
      }
      return count;
    });
    if (imported < fresh.length)
      issues.push({
        row: 0,
        message: `${fresh.length - imported} concurrent email duplicates skipped.`,
      });
  }
  return {
    total: plan.total,
    valid: fresh.length,
    imported,
    invalid: plan.invalid,
    skipped:
      plan.duplicates +
      (plan.candidates.length - fresh.length) +
      (commit ? fresh.length - imported : 0),
    issues: issues.sort((a, b) => a.row - b.row).slice(0, 50),
    examples: fresh
      .slice(0, 10)
      .map(
        (c) =>
          Object.fromEntries(
            importFields.map(([key]) => [key, c.data[key]]),
          ) as Record<ImportField, string | null>,
      ),
  };
}
