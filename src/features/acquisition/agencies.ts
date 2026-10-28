import "server-only";
import { z } from "zod";
import { cachedSource } from "./cached-source";
import { canonicalUrl, organizationDomain, matchedSkills } from "./normalize";
import type { UnifiedFinding } from "./types";
export const agencyEndpoint =
  "https://www.pickanagency.com/api/v1/search?service=Web%20Development&country=United%20States&limit=10";
export const agencyResponse = z.object({
  results: z
    .array(
      z.object({
        slug: z.string().regex(/^[a-z0-9-]{1,200}$/),
        name: z.string().min(1).max(300),
        tagline: z.string().max(3000).default(""),
        location: z.object({
          country: z.string().max(150).nullable(),
          city: z.string().max(150).nullable(),
        }),
        services: z.array(z.string().max(300)).max(100),
        team_size: z.string().max(100).nullable().default(null),
        website: z.string().max(2048).nullable(),
        profile_url: z.string().max(2048),
      }),
    )
    .max(10),
});
export function normalizeAgency(
  a: z.infer<typeof agencyResponse>["results"][number],
  seenAt: string,
): UnifiedFinding {
  const url = canonicalUrl(a.profile_url);
  if (new URL(url).hostname !== "www.pickanagency.com")
    throw new Error("Source supplied an unexpected agency profile origin.");
  let website: string | null = null;
  try {
    if (a.website) website = canonicalUrl(a.website);
  } catch {}
  const relevant = a.services.some((s) =>
    /web (?:development|design)|software|app development|automation|integration|cloud|security/i.test(
      s,
    ),
  );
  const qualityFlags = /\bFBI\b|federal bureau|law enforcement/i.test(a.tagline)
    ? [
        "Directory tagline appears inconsistent with an agency listing; verify identity before using.",
      ]
    : [];
  const services = a.services.join(", ");
  const excerpt = `Directory assertion: ${a.name}. Location: ${a.location.city || "unknown"}, ${a.location.country || "unknown"}. Services: ${services}. Team size (directory-reported): ${a.team_size || "unknown"}. Tagline: ${a.tagline || "not supplied"}. Website: ${website || "not supplied"}.`;
  return {
    provider: "agencies",
    sourceId: a.slug,
    url,
    urlKind: "record",
    title: a.name,
    publishedAt: null,
    seenAt,
    identity: {
      kind: "organization",
      name: a.name,
      domain: organizationDomain(website),
      providerId: a.slug,
    },
    excerpt,
    evidence: {
      origin: "public_api",
      sourceUrl: agencyEndpoint,
      retrievedAt: seenAt,
      notes:
        "Data from Pick an Agency, CC BY 4.0. Directory assertions, not independent company verification. Services offered are not evidence of subcontracting demand; minimum project budgets and ratings are not prospect buying intent.",
    },
    pipeline: "partnership",
    demand: relevant ? "hypothesis" : "irrelevant",
    arrangements: ["unknown"],
    employmentTypeRaw: null,
    geography: "unknown",
    locationRaw:
      [a.location.city, a.location.country].filter(Boolean).join(", ") || null,
    pakistanEligibility: "unknown",
    eligibilityEvidence:
      "Agency location does not establish contractor eligibility or willingness to work with Pakistan.",
    skills: [
      ...matchedSkills(services),
      ...(a.services.some((s) => /web development/i.test(s))
        ? ["Web development"]
        : []),
    ],
    signal: null,
    route: website
      ? {
          url: website,
          purpose: "business_research",
          verification:
            "Directory-listed website. Business/partnership contact permission not established.",
        }
      : null,
    compensation: null,
    currency: null,
    seniority: null,
    timezone: null,
    authorization: null,
    deadline: null,
    competition: null,
    status: "unknown",
    confidence:
      "Suitability hypothesis only. Team size/services are source assertions; no inferred leadership or demand.",
    unknowns: [
      "Partnership/subcontracting need and budget unknown",
      "Appropriate business/partnership route and decision-maker unknown",
      "Official website ownership and technical stack need verification",
      "Directory data may be stale or inconsistent",
      ...qualityFlags,
    ],
    relevance: relevant
      ? `Agency lists ${services}; investigate engineering fit. Not an established buyer.`
      : "No supported technical agency service found.",
    offer:
      "Explore white-label/overflow development or integrations only after confirming a real agency priority; do not assume outsourcing demand.",
    nextAction:
      "Review the official website/team/partnership pages through existing permitted research. Confirm service fit and an appropriate business route before any approach.",
    worthReviewing: relevant && !!website && !qualityFlags.length,
    saveable: relevant && !qualityFlags.length,
    agency: {
      website,
      country: a.location.country,
      city: a.location.city,
      services: a.services,
      teamSize: a.team_size,
      leadership: null,
      partnershipRoute: null,
      partnershipDemand: null,
      qualityFlags,
    },
  };
}
export async function agencyDiscovery() {
  const r = await cachedSource("agencies", agencyEndpoint, (raw) =>
    agencyResponse.parse(raw),
  );
  return {
    ...r,
    findings: r.data.results.map((a) => normalizeAgency(a, r.checkedAt)),
  };
}
