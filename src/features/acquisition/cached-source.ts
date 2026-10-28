import "server-only";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { and, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { acquisitionRuns } from "@/db/schema";
export async function publicJson(url: string, fetcher: typeof fetch = fetch) {
  const r = await fetcher(url, {
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
    headers: {
      Accept: "application/json",
      "User-Agent":
        "HassanOS/1.0 (private operator-triggered acquisition research)",
    },
  });
  if (!r.ok)
    throw new Error(`Source returned HTTP ${r.status}; no bypass attempted.`);
  if (!/^application\/json\b/i.test(r.headers.get("content-type") || ""))
    throw new Error("Source returned unsupported content type.");
  const reader = r.body?.getReader();
  if (!reader) throw new Error("Source returned no body.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 4 * 1024 * 1024) {
      await reader.cancel();
      throw new Error("Source exceeded 4 MiB.");
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}
export async function cachedSource<T>(
  provider: "agencies" | "remoteok",
  endpoint: string,
  parse: (raw: unknown) => T,
) {
  const db = getDb();
  const file = path.join(
    process.cwd(),
    ".local-research",
    provider + "-feed-cache.json",
  );
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`hassanos-${provider}-run`}))`,
    );
    try {
      const c = JSON.parse(await readFile(file, "utf8"));
      const age = Date.now() - Date.parse(c.checkedAt);
      if (age >= 0 && age < 6 * 3600000)
        return {
          data: parse(c.data),
          checkedAt: c.checkedAt as string,
          cached: true,
        };
    } catch {}
    const recent = await tx
      .select()
      .from(acquisitionRuns)
      .where(
        and(
          eq(acquisitionRuns.provider, provider),
          eq(acquisitionRuns.networkAttempt, 1),
          gte(acquisitionRuns.startedAt, new Date(Date.now() - 86400000)),
        ),
      );
    if (recent.length >= 4)
      throw new Error(
        "Source daily request budget reached; wait for the rolling 24-hour window.",
      );
    if (recent.some((r) => Date.now() - r.startedAt.getTime() < 60000))
      throw new Error("Wait one minute before retrying this source.");
    const [run] = await db
      .insert(acquisitionRuns)
      .values({
        provider,
        networkAttempt: 1,
        error: "Source request in progress or interrupted.",
      })
      .returning();
    try {
      const data = parse(await publicJson(endpoint));
      const checkedAt = new Date().toISOString();
      await mkdir(path.dirname(file), { recursive: true });
      const temp = file + "." + crypto.randomUUID() + ".tmp";
      await writeFile(temp, JSON.stringify({ checkedAt, data }));
      await rename(temp, file);
      await db
        .update(acquisitionRuns)
        .set({ success: 1, error: null })
        .where(eq(acquisitionRuns.id, run.id));
      return { data, checkedAt, cached: false };
    } catch (e) {
      const message =
        e instanceof Error && /^Source /.test(e.message)
          ? e.message
          : "Source unavailable, malformed or timed out; nothing fabricated.";
      await db
        .update(acquisitionRuns)
        .set({ error: message })
        .where(eq(acquisitionRuns.id, run.id));
      throw new Error(message);
    }
  });
}
