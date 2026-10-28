import "server-only";
import { getDb } from "@/db";
import { acquisitionRuns } from "@/db/schema";
import { acquisitionQuery, type UnifiedReport, type ProviderId } from "./types";
import {
  businessFindings,
  hnFindings,
  discoverBusinesses,
  discoverHn,
  type LegacyContext,
} from "./adapters";
import { remotiveDiscovery } from "./remotive";
import { countsFor } from "./normalize";
import { normalizeRemotive } from "./normalize";
import { agencyDiscovery } from "./agencies";
import { remoteOkDiscovery } from "./remoteok";
import { uniqueJobFindings } from "./job-identity";
import { savedFindings } from "./store";
import { readFile } from "node:fs/promises";
const state = globalThis as typeof globalThis & {
  unifiedDiscovery?: Map<
    string,
    { report: UnifiedReport; legacy: LegacyContext }
  >;
  unifiedNext?: number;
};
const reports = (state.unifiedDiscovery ??= new Map<
  string,
  { report: UnifiedReport; legacy: LegacyContext }
>());
export async function discoverAcquisition(raw: unknown) {
  const q = acquisitionQuery.parse(raw);
  if (Date.now() < (state.unifiedNext ?? 0))
    throw new Error("Wait 30 seconds between acquisition discovery runs.");
  state.unifiedNext = Date.now() + 30000;
  let legacy: LegacyContext = {};
  let checkedAt = new Date().toISOString();
  let cached = false;
  let findings;
  let note = "";
  let sourceDuplicates = 0;
  let retrievedCount: number | undefined;
  try {
    if (q.provider === "overture") {
      const r = await discoverBusinesses({ area: q.area, trade: q.trade });
      findings = businessFindings(r);
      legacy = { businessToken: r.token };
      checkedAt = r.checkedAt;
      note =
        "Bounded business catalogue sample; client/partnership fit is an unverified hypothesis. No business publication dates or buying signals manufactured.";
    } else if (q.provider === "hn") {
      const input = {
        campaignId: q.campaignId || "00000000-0000-4000-8000-000000000000",
        targetService: q.targetService,
        country: "United States",
        buyerCategory: "any" as const,
        keywords: q.keywords,
        includeUnknown: true,
      };
      const r = await discoverHn(input);
      findings = hnFindings(r);
      legacy = { hnInput: input };
      checkedAt = r.checkedAt;
      note = r.explanation;
    } else if (q.provider === "agencies") {
      const r = await agencyDiscovery();
      findings = r.findings;
      checkedAt = r.checkedAt;
      cached = r.cached;
      note =
        "Data from Pick an Agency (CC BY 4.0). Up to ten US web-development agencies. Services and size are directory assertions, not subcontracting demand. No automatic company-site crawling.";
    } else if (q.provider === "remoteok") {
      const r = await remoteOkDiscovery();
      checkedAt = r.checkedAt;
      cached = r.cached;
      retrievedCount = r.findings.length;
      const known = (await savedFindings())
        .filter((f) => f.pipeline === "job" && f.provider !== "remoteok")
        .map((f) => f.data);
      let compared = false;
      try {
        const c = JSON.parse(
          await readFile(".local-research/remotive-feed-cache.json", "utf8"),
        );
        if (
          Date.now() - Date.parse(c.checkedAt) < 6 * 3600000 &&
          Date.now() >= Date.parse(c.checkedAt)
        ) {
          for (const j of c.data.jobs)
            known.push(normalizeRemotive(j, c.checkedAt));
          compared = true;
        }
      } catch {}
      const unique = uniqueJobFindings(r.findings, known);
      findings = unique.findings;
      sourceDuplicates = unique.duplicates;
      note = `Remote OK public API; attribution/link-back retained, no logo. Unknown location and digital-nomad tags do not establish eligibility. Cross-source duplicates require identical published application target, employer text and title. ${compared ? "Compared with recent cached Remotive feed and selected jobs." : "Recent Remotive cache unavailable; compared with selected jobs only. Potential duplicates without shared application evidence remain unresolved."}`;
    } else {
      const r = await remotiveDiscovery();
      findings = r.findings;
      checkedAt = r.checkedAt;
      cached = r.cached;
      note =
        "Remotive free API, delayed 24 hours. Small/noisy subset; worldwide advertising is not confirmed Pakistan eligibility. Application listing, not sales outreach. Cache reused for six hours.";
    }
    const seen = new Set<string>();
    let duplicates = sourceDuplicates;
    findings = findings.filter((f) => {
      const key = `${f.provider}:${f.sourceId}`;
      if (seen.has(key)) {
        duplicates++;
        return false;
      }
      seen.add(key);
      return true;
    });
    const counts = countsFor(
      findings,
      retrievedCount ?? findings.length + duplicates,
      duplicates,
    );
    if (q.provider !== "remotive" || cached)
      await getDb().insert(acquisitionRuns).values({
        provider: q.provider,
        success: 1,
        counts,
        networkAttempt: 0,
      });
    const report: UnifiedReport = {
      token: crypto.randomUUID(),
      provider: q.provider,
      checkedAt,
      cached,
      counts,
      findings,
      note,
    };
    for (const [key, v] of reports)
      if (
        Date.now() - Date.parse(v.report.checkedAt) > 600000 &&
        !["remotive", "remoteok", "agencies"].includes(v.report.provider)
      )
        reports.delete(key);
    while (reports.size >= 3) reports.delete(reports.keys().next().value!);
    reports.set(report.token, { report, legacy });
    return report;
  } catch (e) {
    if (q.provider !== "remotive")
      await getDb().insert(acquisitionRuns).values({
        provider: q.provider,
        success: 0,
        error:
          "Discovery failed or rate limited; no fabricated results or automatic saves.",
      });
    throw e;
  }
}
export function selectedFinding(
  token: string,
  provider: ProviderId,
  sourceId: string,
) {
  const entry = reports.get(token);
  const finding = entry?.report.findings.find(
    (f) => f.provider === provider && f.sourceId === sourceId,
  );
  if (
    !entry ||
    !finding ||
    Date.now() - Date.parse(entry.report.checkedAt) >
      (["remotive", "remoteok", "agencies"].includes(provider)
        ? 6 * 3600000
        : 600000)
  )
    throw new Error("Run discovery again; the source snapshot expired.");
  return { finding, legacy: entry.legacy };
}
