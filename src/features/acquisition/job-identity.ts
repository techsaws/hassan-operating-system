import { load } from "cheerio";
import { canonicalUrl, plainText } from "./normalize";
import type { UnifiedFinding } from "./types";
export function publishedApplicationTarget(html: string) {
  const $ = load(html);
  const candidates: string[] = [];
  for (const a of $("a[href]").toArray())
    if (/^apply(?:\s|$)|application form/i.test($(a).text().trim()))
      candidates.push($(a).attr("href") || "");
  for (const match of plainText(html).matchAll(
    /(?:apply at|application (?:URL|link):)\s*(https?:\/\/[^\s<>]+)/gi,
  ))
    candidates.push(match[1]);
  for (const raw of candidates) {
    try {
      const url = canonicalUrl(raw.replace(/[).,;]+$/, ""));
      const u = new URL(url);
      if (
        ["remotive.com", "remoteok.com"].includes(u.hostname) ||
        (u.pathname === "/" && !u.search)
      )
        continue;
      return url;
    } catch {}
  }
  return null;
}
export function openingKey(f: UnifiedFinding) {
  if (f.pipeline !== "job" || !f.identity?.name) return null;
  const target = f.applicationTarget || publishedApplicationTarget(f.excerpt);
  if (!target) return null;
  const title = f.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const employer = f.identity.name.toLowerCase().replace(/\s+/g, " ").trim();
  // Never merge on names/titles alone. Require the identical published application target too.
  return JSON.stringify([target, employer, title]);
}
export function uniqueJobFindings(
  findings: UnifiedFinding[],
  known: UnifiedFinding[],
) {
  const keys = new Set(known.map(openingKey).filter((k): k is string => !!k));
  let duplicates = 0;
  const retained = findings.filter((f) => {
    const key = openingKey(f);
    if (key && keys.has(key)) {
      duplicates++;
      return false;
    }
    if (key) keys.add(key);
    return true;
  });
  return { findings: retained, duplicates };
}
