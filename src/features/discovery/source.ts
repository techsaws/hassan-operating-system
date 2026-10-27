import "server-only";
import { z } from "zod";
import {
  discoveryInput,
  type DiscoveryInput,
  type DiscoveryReport,
} from "./types";
import { classifyComment, type HnComment } from "./classify";
import { researchToday } from "@/features/opportunities/dates";
const threadTitle =
  /^Ask HN:\s*Freelancer\?\s*Seeking freelancer\?\s*\([A-Za-z]+ \d{4}\)$/i;
export const DISCOVERY_SOURCE = "HN freelance requests via Algolia public API";
const hitSchema = z.object({
  objectID: z.string().regex(/^\d+$/),
  title: z.string().nullable().optional(),
  created_at: z.iso.datetime({ offset: true }),
  comment_text: z.string().nullable().optional(),
  author: z.string().nullable(),
  parent_id: z.number().nullable().optional(),
});
const searchSchema = z.object({
  hits: z.array(hitSchema).max(100),
  nbHits: z.number().nonnegative(),
  nbPages: z.number().nonnegative(),
});
const itemSchema = z.object({
  id: z.number().int().positive(),
  type: z.string(),
  text: z.string().nullable().optional(),
  author: z.string().nullable(),
  created_at: z.iso.datetime({ offset: true }),
  parent_id: z.number().nullable().optional(),
  title: z.string().nullable().optional(),
});
export async function hnJson(
  path: string,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  // Fixed API origin and internally constructed paths only. Never follow an API-supplied URL.
  const response = await fetcher(`https://hn.algolia.com/api/v1/${path}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "HassanOSDiscovery/1.0 (manual freelance-request research)",
    },
    redirect: "error",
    cache: "no-store",
    signal,
  });
  if (!response.ok)
    throw new Error(
      response.status === 429
        ? "HN API rate limit reached. Stop and retry later; no alternate access will be attempted."
        : `HN API unavailable (HTTP ${response.status}). Use the manual search links.`,
    );
  if (!/^application\/json\b/i.test(response.headers.get("content-type") || ""))
    throw new Error("HN returned unsupported data. Use manual search.");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("HN returned no data.");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.length;
    if (bytes > 2 * 1024 * 1024) {
      await reader.cancel();
      throw new Error(
        "HN response exceeded 2 MiB; narrow the request or use manual search.",
      );
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}
function checkDate(value: string, cutoff: string, today: string) {
  return (
    Number.isFinite(Date.parse(value)) &&
    value.slice(0, 10) >= cutoff &&
    value.slice(0, 10) <= today
  );
}
export async function discoverHn(
  raw: unknown,
  fetcher: typeof fetch = fetch,
): Promise<DiscoveryReport> {
  const input = discoveryInput.parse(raw);
  const today = researchToday();
  const cutoff = new Date(Date.parse(today) - 90 * 86400000)
    .toISOString()
    .slice(0, 10);
  const signal = AbortSignal.timeout(30000);
  const params = new URLSearchParams({
    query: '"Freelancer? Seeking freelancer?"',
    tags: "story",
    hitsPerPage: "20",
    numericFilters: `created_at_i>${Math.floor(Date.parse(cutoff) / 1000)}`,
  });
  const threadSearch = searchSchema.parse(
    await hnJson(`search_by_date?${params}`, signal, fetcher),
  );
  const seenMonths = new Set<string>();
  const selected = threadSearch.hits
    .filter((h) => {
      if (
        !h.title ||
        !threadTitle.test(h.title) ||
        !checkDate(h.created_at, cutoff, today)
      )
        return false;
      const month = h.title.match(/\((.+)\)$/)![1];
      if (seenMonths.has(month)) return false;
      seenMonths.add(month);
      return true;
    })
    .slice(0, 3);
  const threads = selected.map((h) => ({
    id: h.objectID,
    title: h.title!,
    url: `https://news.ycombinator.com/item?id=${h.objectID}`,
  }));
  const findings = [];
  let upstreamComments = 0;
  let partial = false;
  for (const thread of threads) {
    for (let page = 0; page < 2; page++) {
      const query = new URLSearchParams({
        tags: `comment,story_${thread.id}`,
        hitsPerPage: "100",
        page: String(page),
      });
      const data = searchSchema.parse(
        await hnJson(`search_by_date?${query}`, signal, fetcher),
      );
      if (page === 0) {
        upstreamComments += data.nbHits;
        if (data.nbPages > 2) partial = true;
      }
      for (const h of data.hits) {
        if (
          !h.comment_text ||
          !h.parent_id ||
          !checkDate(h.created_at, cutoff, today)
        )
          continue;
        findings.push(
          classifyComment(
            {
              id: h.objectID,
              parentId: String(h.parent_id),
              publishedAt: h.created_at,
              html: h.comment_text,
              author: h.author,
            },
            thread.id,
            input,
            today,
          ),
        );
      }
      if (page + 1 >= data.nbPages) break;
    }
  }
  const unique = [...new Map(findings.map((f) => [f.itemId, f])).values()];
  const classifications: DiscoveryReport["classifications"] = {
    explicit_request: 0,
    uncertain_opportunity: 0,
    informational: 0,
    irrelevant: 0,
  };
  unique.forEach((f) => classifications[f.classification]++);
  unique.sort(
    (a, b) =>
      Number(b.saveable) - Number(a.saveable) ||
      Number(b.classification === "explicit_request") -
        Number(a.classification === "explicit_request") ||
      Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );
  const eligible = unique.filter((f) => f.saveable);
  return {
    source: DISCOVERY_SOURCE,
    checkedAt: new Date().toISOString(),
    cutoff,
    threads,
    scanned: unique.length,
    upstreamComments,
    partial,
    classifications,
    matching: unique.filter(
      (f) =>
        f.matches &&
        ["explicit_request", "uncertain_opportunity"].includes(
          f.classification,
        ),
    ).length,
    companies: eligible.filter((f) => f.companyName).length,
    contactRoutes: eligible.filter((f) => f.contactRoute).length,
    worthReviewing: eligible.length,
    findings: unique.map((f) =>
      ["explicit_request", "uncertain_opportunity"].includes(f.classification)
        ? f
        : { ...f, excerpt: "", contactEmail: null, contactRoute: null },
    ),
    explanation: eligible.length
      ? `${eligible.length} candidate request(s) merit manual review. Country, company size, budget and availability are not inferred from keywords.`
      : `No current matching freelance buyer requests were established in ${unique.length} scanned comments. Service advertisements, discussions, stale/closed requests and filter mismatches are not prospects. Use the prepared manual search links or try another service/keywords; a successful API request is not a buyer pipeline.`,
  };
}
export async function refreshFinding(
  itemId: string,
  raw: DiscoveryInput,
  fetcher: typeof fetch = fetch,
) {
  z.string()
    .regex(/^\d{1,12}$/)
    .parse(itemId);
  const input = discoveryInput.parse(raw);
  const signal = AbortSignal.timeout(20000);
  const item = itemSchema.parse(
    await hnJson(`items/${itemId}`, signal, fetcher),
  );
  if (String(item.id) !== itemId)
    throw new Error("The source returned an unexpected item ID.");
  if (item.type !== "comment" || !item.text || !item.author || !item.parent_id)
    throw new Error(
      "The source post is deleted, unavailable, or is not a buyer comment.",
    );
  const parent = itemSchema.parse(
    await hnJson(`items/${item.parent_id}`, signal, fetcher),
  );
  if (
    parent.id !== item.parent_id ||
    parent.type !== "story" ||
    !parent.title ||
    !threadTitle.test(parent.title)
  )
    throw new Error(
      "Only original buyer posts in dedicated HN freelance threads can be saved.",
    );
  const finding = classifyComment(
    {
      id: String(item.id),
      parentId: String(item.parent_id),
      publishedAt: item.created_at,
      html: item.text,
      author: item.author,
    } satisfies HnComment,
    String(parent.id),
    input,
    researchToday(),
  );
  if (!finding.saveable)
    throw new Error(
      "This refreshed result is not a current matching buyer candidate. It may be closed, stale, informational, or a service advertisement.",
    );
  return finding;
}
