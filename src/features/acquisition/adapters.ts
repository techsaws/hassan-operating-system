import "server-only";
import { discoverBusinesses } from "@/features/discovery/business-source";
import { discoverHn } from "@/features/discovery/source";
import type { BusinessReport } from "@/features/discovery/business-types";
import type {
  DiscoveryInput,
  DiscoveryReport,
} from "@/features/discovery/types";
import type { UnifiedFinding } from "./types";
import { organizationDomain } from "./normalize";
function base(): Pick<
  UnifiedFinding,
  | "compensation"
  | "currency"
  | "seniority"
  | "timezone"
  | "authorization"
  | "deadline"
  | "competition"
  | "employmentTypeRaw"
  | "urlKind"
> {
  return {
    compensation: null,
    currency: null,
    seniority: null,
    timezone: null,
    authorization: null,
    deadline: null,
    competition: null,
    employmentTypeRaw: null,
    urlKind: "record",
  };
}
export function businessFindings(r: BusinessReport): UnifiedFinding[] {
  return r.businesses.map((b) => ({
    ...base(),
    provider: "overture",
    sourceId: b.id,
    url:
      b.websites[0] ||
      `https://stac.overturemaps.org/${r.release}/collections.parquet`,
    urlKind: b.websites[0] ? "record" : "catalogue",
    title: b.name,
    publishedAt: null,
    seenAt: r.checkedAt,
    identity: {
      kind: "organization",
      name: b.name,
      domain: organizationDomain(b.websites[0] || null),
      providerId: b.id,
    },
    excerpt: `Catalogue: ${b.name}; ${b.city ?? "unknown city"}, ${b.region ?? "unknown region"}, US; ${b.category}. Source-listed phone(s), not verified: ${b.phones.join(", ") || "none"}. Operating status: ${b.status ?? "unknown"}. Source release: ${r.release}. Providers: ${b.sources.map((s) => `${s.dataset} (${s.license}; ${s.updateTime ?? "unknown update"})`).join("; ")}.`,
    evidence: {
      origin: "open_catalogue",
      sourceUrl: `https://stac.overturemaps.org/${r.release}/collections.parquet`,
      retrievedAt: r.checkedAt,
      notes:
        "Catalogue identity/domain assertions, not verified ownership, size, demand or contact permission. Release date is not a business event/publication date.",
    },
    pipeline: "research",
    demand: "hypothesis",
    arrangements: ["unknown"],
    geography: "unknown",
    locationRaw: `${b.city ?? "unknown city"}, ${b.region ?? "unknown region"}, US`,
    pakistanEligibility: "unknown",
    eligibilityEvidence:
      "US business location says nothing about remote work or Pakistan eligibility.",
    skills: ["AI / automation"],
    signal: null,
    route: b.websites[0]
      ? {
          url: b.websites[0],
          purpose: "business_research",
          verification: "Source-listed website; not an approved sales route.",
        }
      : null,
    status: b.status && /closed/i.test(b.status) ? "closed" : "unknown",
    confidence:
      "Identity/category asserted by the catalogue; no qualification confidence assigned.",
    unknowns: [
      "Actual need / buying intent",
      "Company size and residential focus",
      "Decision-maker and appropriate business contact route",
      "Current identity / official website ownership",
    ],
    relevance:
      "Home-service category candidate for workflow research; not an established buyer.",
    offer:
      "Investigate intake/scheduling/follow-up; propose nothing until a real priority is confirmed.",
    nextAction:
      "Review the official website and existing contact/workflow research; customer booking forms are not sales channels.",
    worthReviewing: !b.status || !/closed/i.test(b.status),
    saveable: !b.status || !/closed/i.test(b.status),
  }));
}
export function hnFindings(r: DiscoveryReport): UnifiedFinding[] {
  return r.findings.map((f) => ({
    ...base(),
    provider: "hn",
    sourceId: f.itemId,
    url: f.sourceUrl,
    title: f.title,
    publishedAt: f.publishedAt,
    seenAt: r.checkedAt,
    identity: f.companyName
      ? {
          kind: "organization",
          name: f.companyName,
          domain: null,
          providerId: null,
        }
      : null,
    excerpt: f.excerpt,
    evidence: {
      origin: "public_api",
      sourceUrl: `https://hn.algolia.com/api/v1/items/${f.itemId}`,
      retrievedAt: r.checkedAt,
      notes:
        "Original public freelance post; heuristics are not verification of budget, identity or availability.",
    },
    pipeline: f.saveable ? "client" : "research",
    demand:
      f.classification === "explicit_request"
        ? "explicit_demand"
        : f.classification === "uncertain_opportunity"
          ? "indirect_signal"
          : f.classification === "irrelevant"
            ? "irrelevant"
            : "hypothesis",
    arrangements: ["freelance"],
    geography: "unknown",
    locationRaw: f.countryEvidence,
    pakistanEligibility: "unknown",
    eligibilityEvidence:
      "Freelance post does not establish remote-work eligibility.",
    skills: [f.service],
    signal: f.saveable
      ? "Post identifies itself as seeking freelancer help."
      : null,
    route: f.contactRoute
      ? {
          url: f.contactRoute.url,
          purpose: "buyer_contact",
          verification:
            f.contactRoute.evidence + "; purpose/identity need review.",
        }
      : null,
    status: f.availability,
    confidence:
      "Deterministic HN buyer/seller classification; original evidence requires review.",
    unknowns: f.missing,
    relevance: f.reasons.join(" ") || "No commercial relevance established.",
    offer:
      "Evaluate the stated freelance need; do not confuse seller advertisements with buyers.",
    nextAction:
      "Read the original post and confirm scope, identity and route; no generated HN comments.",
    worthReviewing: f.saveable,
    saveable: f.saveable || f.classification === "informational",
  }));
}
export { discoverBusinesses, discoverHn };
export type LegacyContext = {
  businessToken?: string;
  hnInput?: DiscoveryInput;
};
