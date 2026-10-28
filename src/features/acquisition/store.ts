import "server-only";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { acquisitionEntities, acquisitionFindings } from "@/db/schema";
import type { UnifiedFinding, Pipeline } from "./types";
import { canonicalUrl } from "./normalize";
import { openingKey } from "./job-identity";
export async function persistFinding(
  f: UnifiedFinding,
  pipeline: Pipeline,
  legacyOpportunityId: string | null = null,
) {
  if (f.pipeline === "job" && pipeline !== "job")
    throw new Error(
      "Job postings must stay in the remote-job pipeline, never client sales.",
    );
  if (f.pipeline !== "job" && pipeline === "job")
    throw new Error(
      "Business/research records cannot be reclassified as a job without hiring evidence.",
    );
  if (!f.saveable)
    throw new Error("This finding is excluded; it is not saveable.");
  const url = canonicalUrl(f.url);
  const db = getDb();
  return db.transaction(async (tx) => {
    const opening = openingKey(f);
    for (const key of [
      `finding:${f.provider}:${f.sourceId}`,
      `url:${url}`,
      ...(opening ? ["opening:" + opening] : []),
    ].sort())
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${key}))`);
    let [existing] = await tx
      .select()
      .from(acquisitionFindings)
      .where(
        or(
          and(
            eq(acquisitionFindings.provider, f.provider),
            eq(acquisitionFindings.sourceId, f.sourceId),
          ),
          f.urlKind === "record"
            ? and(
                eq(acquisitionFindings.sourceUrl, url),
                sql`${acquisitionFindings.data}->>'urlKind' = 'record'`,
              )
            : undefined,
          sql`${acquisitionFindings.aliases} @> ${JSON.stringify([{ provider: f.provider, sourceId: f.sourceId }])}::jsonb`,
        ),
      )
      .limit(1);
    if (!existing && opening) {
      const jobs = await tx
        .select()
        .from(acquisitionFindings)
        .where(eq(acquisitionFindings.pipeline, "job"))
        .limit(500);
      existing = jobs.find((j) => openingKey(j.data) === opening)!;
    }
    if (existing) {
      const aliases = existing.aliases.some(
        (a) => a.provider === f.provider && a.sourceId === f.sourceId,
      )
        ? existing.aliases
        : [
            ...existing.aliases,
            {
              provider: f.provider,
              sourceId: f.sourceId,
              url,
              seenAt: f.seenAt,
            },
          ].slice(-20);
      await tx
        .update(acquisitionFindings)
        .set({
          lastSeen: new Date(),
          aliases,
          legacyOpportunityId:
            existing.legacyOpportunityId || legacyOpportunityId,
        })
        .where(eq(acquisitionFindings.id, existing.id));
      return {
        id: existing.id,
        existing: true,
        pipeline: existing.pipeline as Pipeline,
        legacyOpportunityId:
          existing.legacyOpportunityId || legacyOpportunityId,
      };
    }
    let entityId: string | null = null;
    if (f.identity) {
      const ident = f.identity;
      const key = `${f.provider}:${ident.kind}:${ident.providerId || "record:" + f.sourceId}`;
      for (const lock of [
        key,
        ...(ident.domain ? ["domain:" + ident.domain] : []),
      ].sort())
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${lock}))`);
      const matches = await tx
        .select()
        .from(acquisitionEntities)
        .where(
          or(
            sql`${acquisitionEntities.identifiers} @> ${JSON.stringify([key])}::jsonb`,
            ident.domain
              ? eq(acquisitionEntities.canonicalDomain, ident.domain)
              : undefined,
          ),
        );
      if (matches.length > 1)
        throw new Error(
          "Conflicting identity identifiers require manual review; nothing was merged.",
        );
      const existingEntity = matches[0];
      if (existingEntity) {
        if (
          existingEntity.kind !== ident.kind ||
          (existingEntity.canonicalDomain &&
            ident.domain &&
            existingEntity.canonicalDomain !== ident.domain)
        )
          throw new Error(
            "Conflicting identity identifiers require manual review; nothing was merged.",
          );
        entityId = existingEntity.id;
        await tx
          .update(acquisitionEntities)
          .set({
            canonicalDomain: existingEntity.canonicalDomain || ident.domain,
            identifiers: [...new Set([...existingEntity.identifiers, key])],
          })
          .where(eq(acquisitionEntities.id, entityId));
      } else
        entityId = (
          await tx
            .insert(acquisitionEntities)
            .values({
              name: ident.name,
              kind: ident.kind,
              canonicalDomain: ident.domain,
              identifiers: [key],
            })
            .returning()
        )[0].id;
    }
    const [saved] = await tx
      .insert(acquisitionFindings)
      .values({
        provider: f.provider,
        sourceId: f.sourceId,
        sourceUrl: url,
        entityId,
        pipeline,
        data: {
          ...f,
          pipeline,
          ...(pipeline !== f.pipeline
            ? {
                demand: "hypothesis" as const,
                confidence:
                  f.confidence +
                  " Pipeline chosen by operator as an unverified hypothesis; original source classification: " +
                  f.pipeline +
                  ".",
              }
            : {}),
        },
        legacyOpportunityId,
        firstSeen: new Date(f.seenAt),
        lastSeen: new Date(f.seenAt),
        aliases: [
          { provider: f.provider, sourceId: f.sourceId, url, seenAt: f.seenAt },
        ],
      })
      .returning();
    return { id: saved.id, existing: false, legacyOpportunityId, pipeline };
  });
}
export async function savedFindings() {
  return getDb()
    .select()
    .from(acquisitionFindings)
    .orderBy(desc(acquisitionFindings.lastSeen))
    .limit(500);
}
