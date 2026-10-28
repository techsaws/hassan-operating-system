import { z } from "zod";
export const pipelines = ["client", "job", "partnership", "research"] as const;
export const arrangements = [
  "full_time",
  "part_time",
  "fixed_term",
  "independent_contractor",
  "freelance",
  "project",
  "hourly",
  "retainer",
  "temporary",
  "internship",
  "apprenticeship",
  "contract_to_hire",
  "fractional",
  "agency_subcontract",
  "recurring",
  "contract_unspecified",
  "unknown",
] as const;
export const geographies = [
  "worldwide",
  "pakistan_eligible",
  "apac",
  "emea",
  "us_only",
  "eu_only",
  "other_restricted",
  "unknown",
] as const;
export type ProviderId = "overture" | "hn" | "remotive";
export type Pipeline = (typeof pipelines)[number];
export type Arrangement = (typeof arrangements)[number];
export type Geography = (typeof geographies)[number];
export type UnifiedFinding = {
  provider: ProviderId;
  sourceId: string;
  url: string;
  urlKind: "record" | "catalogue";
  title: string;
  publishedAt: string | null;
  seenAt: string;
  identity: {
    kind: "organization" | "person";
    name: string;
    domain: string | null;
    providerId: string | null;
  } | null;
  excerpt: string;
  evidence: {
    origin: "public_api" | "open_catalogue";
    sourceUrl: string;
    retrievedAt: string;
    notes: string;
  };
  pipeline: Pipeline;
  demand: "explicit_demand" | "indirect_signal" | "hypothesis" | "irrelevant";
  arrangements: Arrangement[];
  employmentTypeRaw: string | null;
  geography: Geography;
  locationRaw: string | null;
  pakistanEligibility: "confirmed" | "excluded" | "unknown";
  eligibilityEvidence: string | null;
  skills: string[];
  signal: string | null;
  route: {
    url: string;
    purpose: "application" | "business_research" | "buyer_contact";
    verification: string;
  } | null;
  compensation: string | null;
  currency: string | null;
  seniority: string | null;
  timezone: string | null;
  authorization: string | null;
  deadline: string | null;
  competition: string | null;
  status: "current_unconfirmed" | "stale" | "expired" | "closed" | "unknown";
  confidence: string;
  unknowns: string[];
  relevance: string;
  offer: string;
  nextAction: string;
  worthReviewing: boolean;
  saveable: boolean;
};
export type RunCounts = {
  retrieved: number;
  relevant: number;
  organizations: number;
  routes: number;
  pakistanConfirmed: number;
  eligibilityUnknown: number;
  duplicates: number;
  worthReviewing: number;
};
export type UnifiedReport = {
  token: string;
  provider: ProviderId;
  checkedAt: string;
  cached: boolean;
  counts: RunCounts;
  findings: UnifiedFinding[];
  note: string;
};
export const acquisitionQuery = z.object({
  provider: z.enum(["overture", "hn", "remotive"]),
  area: z.enum(["raleigh", "austin", "tampa"]).default("raleigh"),
  trade: z.enum(["all", "hvac", "plumbing", "electrical"]).default("all"),
  campaignId: z.union([z.uuid(), z.literal("")]).default(""),
  targetService: z
    .enum(["automation", "software", "backend", "security"])
    .default("automation"),
  keywords: z.string().trim().max(120).default(""),
});
export type AcquisitionQuery = z.infer<typeof acquisitionQuery>;
export type FindingFilter = {
  provider: string;
  pipeline: string;
  arrangement: string;
  geography: string;
  skill: string;
  freshness: string;
  status: string;
};
export const emptyFilters: FindingFilter = {
  provider: "",
  pipeline: "",
  arrangement: "",
  geography: "",
  skill: "",
  freshness: "",
  status: "",
};
export function filterFinding(
  f: UnifiedFinding,
  q: FindingFilter,
  now = Date.now(),
) {
  if (
    (q.provider && f.provider !== q.provider) ||
    (q.pipeline && f.pipeline !== q.pipeline) ||
    (q.arrangement && !f.arrangements.includes(q.arrangement as Arrangement)) ||
    (q.geography && f.geography !== q.geography) ||
    (q.status && f.status !== q.status)
  )
    return false;
  if (
    q.skill &&
    !f.skills.some((s) => s.toLowerCase().includes(q.skill.toLowerCase()))
  )
    return false;
  if (q.freshness) {
    const age = f.publishedAt
      ? (now - Date.parse(f.publishedAt)) / 86400000
      : Infinity;
    if (age < 0 || age > Number(q.freshness)) return false;
  }
  return true;
}
