import "server-only";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import path from "node:path";
import { and, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { acquisitionRuns } from "@/db/schema";
import { remotiveResponse, normalizeRemotive, countsFor } from "./normalize";
const endpoint = "https://remotive.com/api/remote-jobs?category=software-dev";
export function assertRemotiveBudget(attempts: Date[], now = Date.now()) {
  const recent = attempts.filter((d) => now - d.getTime() < 86400000);
  if (recent.length >= 4)
    throw new Error(
      "Remotive daily request budget reached. Wait for the rolling 24-hour window; no alternate endpoint will be used.",
    );
  if (recent.some((d) => now - d.getTime() < 60000))
    throw new Error("Wait at least a minute before retrying Remotive.");
}
export async function fetchRemotive(fetcher: typeof fetch = fetch) {
  const response = await fetcher(endpoint, {
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
    headers: {
      Accept: "application/json",
      "User-Agent": "HassanOS/1.0 (private manual job research)",
    },
  });
  if (!response.ok)
    throw new Error(
      `Remotive returned HTTP ${response.status}; no bypass attempted.`,
    );
  if (!/^application\/json\b/i.test(response.headers.get("content-type") || ""))
    throw new Error("Remotive returned an unsupported content type.");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Remotive returned no body.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 12 * 1024 * 1024) {
      await reader.cancel();
      throw new Error("Remotive response exceeded 12 MiB.");
    }
    chunks.push(value);
  }
  return remotiveResponse.parse(
    JSON.parse(Buffer.concat(chunks).toString("utf8")),
  );
}
export async function remotiveDiscovery() {
  const file = path.join(
    process.cwd(),
    ".local-research",
    "remotive-feed-cache.json",
  );
  const db = getDb();
  // One database lock coordinates simultaneous app requests. Cache is local, never public Git.
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext('hassanos-remotive-run'))`,
    );
    let data: ReturnType<typeof remotiveResponse.parse> | null = null;
    let checkedAt = new Date().toISOString();
    let cached = false;
    try {
      const stat = JSON.parse(await readFile(file, "utf8"));
      if (
        Date.now() - Date.parse(stat.checkedAt) >= 0 &&
        Date.now() - Date.parse(stat.checkedAt) < 6 * 3600000
      ) {
        data = remotiveResponse.parse(stat.data);
        checkedAt = stat.checkedAt;
        cached = true;
      }
    } catch {
      /* Missing/invalid cache is not evidence; quota still applies. */
    }
    if (data) {
      const findings = data.jobs.map((j) => normalizeRemotive(j, checkedAt));
      return { findings, checkedAt, cached, runId: null };
    }
    const recent = await tx
      .select()
      .from(acquisitionRuns)
      .where(
        and(
          eq(acquisitionRuns.provider, "remotive"),
          eq(acquisitionRuns.networkAttempt, 1),
          gte(acquisitionRuns.startedAt, new Date(Date.now() - 86400000)),
        ),
      );
    assertRemotiveBudget(recent.map((r) => r.startedAt));
    // Use an independent committed reservation so timeouts/failures still consume quota.
    const [run] = await db
      .insert(acquisitionRuns)
      .values({
        provider: "remotive",
        networkAttempt: 1,
        error: "Request in progress or interrupted.",
      })
      .returning();
    try {
      data = await fetchRemotive();
      checkedAt = new Date().toISOString();
      const findings = data.jobs.map((j) => normalizeRemotive(j, checkedAt));
      await mkdir(path.dirname(file), { recursive: true });
      const temporary = file + "." + crypto.randomUUID() + ".tmp";
      await writeFile(temporary, JSON.stringify({ checkedAt, data }));
      await rename(temporary, file);
      await db
        .update(acquisitionRuns)
        .set({ success: 1, counts: countsFor(findings), error: null })
        .where(eq(acquisitionRuns.id, run.id));
      return { findings, checkedAt, cached: false, runId: run.id };
    } catch {
      await db
        .update(acquisitionRuns)
        .set({
          success: 0,
          error:
            "Feed unavailable, invalid or timed out. No fake results saved; retry within provider limits.",
        })
        .where(eq(acquisitionRuns.id, run.id));
      throw new Error(
        "Remotive feed unavailable, invalid or timed out. Existing saved opportunities are unchanged.",
      );
    }
  });
}
