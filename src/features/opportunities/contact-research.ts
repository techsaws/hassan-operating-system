import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { opportunities } from "@/db/schema";
import {
  retrievePublicPage,
  publicUrl,
  type RetrievalDependencies,
} from "./retrieval";
import {
  blankAnnotation,
  validateAnnotation,
  type ContactSource,
} from "./contact-types";
async function appendSource(id: string, source: ContactSource) {
  z.uuid().parse(id);
  return getDb().transaction(async (tx) => {
    const [o] = await tx
      .select()
      .from(opportunities)
      .where(eq(opportunities.id, id))
      .for("update");
    if (!o) throw new Error("Opportunity not found.");
    const sources = o.contactResearch?.sources ?? [];
    if (sources.length >= 8)
      throw new Error(
        "Eight source snapshots already recorded. Review existing sources before adding more.",
      );
    if (
      sources.some((s) => s.url === source.url && s.excerpt === source.excerpt)
    )
      return o;
    return (
      await tx
        .update(opportunities)
        .set({
          contactResearch: { sources: [...sources, source] },
          updatedAt: new Date(),
        })
        .where(eq(opportunities.id, id))
        .returning()
    )[0];
  });
}
export async function researchContact(
  id: string,
  url: string,
  consent: boolean,
  deps?: RetrievalDependencies,
) {
  z.uuid().parse(id);
  if (consent !== true)
    throw new Error("Confirm public access and permission before retrieval.");
  // Same robots, DNS pinning, redirect, SSRF, timeout/type/size/restriction rules as existing research.
  const result = await retrievePublicPage(url, "", deps);
  return appendSource(id, {
    id: crypto.randomUUID(),
    url: result.sourceUrl,
    excerpt: result.excerpt,
    origin: "retrieved",
    recordedAt: result.retrievedAt.toISOString(),
    annotation: { ...blankAnnotation },
  });
}
export async function recordManualContactSource(
  id: string,
  url: string,
  excerpt: string,
) {
  const safe = publicUrl(url).href;
  const text = z.string().trim().min(20).max(4000).parse(excerpt);
  return appendSource(id, {
    id: crypto.randomUUID(),
    url: safe,
    excerpt: text,
    origin: "operator",
    recordedAt: new Date().toISOString(),
    annotation: { ...blankAnnotation },
  });
}
export async function annotateContactSource(
  id: string,
  sourceId: string,
  raw: unknown,
) {
  z.uuid().parse(id);
  z.uuid().parse(sourceId);
  return getDb().transaction(async (tx) => {
    const [o] = await tx
      .select()
      .from(opportunities)
      .where(eq(opportunities.id, id))
      .for("update");
    const source = o?.contactResearch?.sources.find((s) => s.id === sourceId);
    if (!source) throw new Error("Research source not found.");
    const annotation = validateAnnotation(raw, source);
    return (
      await tx
        .update(opportunities)
        .set({
          contactResearch: {
            sources: o.contactResearch!.sources.map((s) =>
              s.id === sourceId ? { ...s, annotation } : s,
            ),
          },
          updatedAt: new Date(),
        })
        .where(eq(opportunities.id, id))
        .returning()
    )[0];
  });
}
