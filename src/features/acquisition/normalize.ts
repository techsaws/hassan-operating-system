import { load } from "cheerio";
import { z } from "zod";
import type {
  UnifiedFinding,
  Geography,
  Arrangement,
  RunCounts,
} from "./types";
export function plainText(html: string) {
  const $ = load(html);
  $("script,style,iframe,svg,form").remove();
  $("p,li,h1,h2,h3,br").after("\n");
  return $.text()
    .replace(/[\t ]+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim();
}
export function canonicalUrl(value: string) {
  const u = new URL(value);
  if (
    !["http:", "https:"].includes(u.protocol) ||
    u.username ||
    u.password ||
    !u.hostname.includes(".") ||
    /^\[|^[\d.]+$/.test(u.hostname) ||
    /localhost|\.(local|internal|test|invalid)$/.test(u.hostname)
  )
    throw new Error("Unsupported source URL.");
  u.hash = "";
  for (const key of [...u.searchParams.keys()])
    if (/^utm_|^(gclid|fbclid)$/i.test(key)) u.searchParams.delete(key);
  u.searchParams.sort();
  return u.href;
}
export function organizationDomain(value: string | null) {
  if (!value) return null;
  try {
    const u = new URL(canonicalUrl(value));
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    if (
      [
        "remotive.com",
        "news.ycombinator.com",
        "linkedin.com",
        "facebook.com",
        "instagram.com",
        "github.com",
        "linktr.ee",
      ].some((d) => host === d || host.endsWith("." + d))
    )
      return null;
    return host;
  } catch {
    return null;
  }
}
const skillRules: [string, RegExp][] = [
  ["AI / automation", /\b(?:AI|LLM|machine learning|automation|AI\/ML)\b/i],
  ["Python", /\bpython\b/i],
  ["Backend", /back.?end|distributed systems/i],
  ["Full-stack", /full.?stack/i],
  ["Next.js", /next\.js|nextjs/i],
  ["React", /\breact\b/i],
  ["Node.js", /node\.?js/i],
  ["PostgreSQL", /postgres(?:ql)?/i],
  ["APIs / integrations", /\bAPIs?\b|integration/i],
  ["Cloud", /\bAWS\b|\bazure\b|cloud|kubernetes|infrastructure/i],
  ["Security", /cybersecurity|application security|\bsecurity\b/i],
  ["SaaS", /\bSaaS\b/i],
];
export function matchedSkills(text: string) {
  return skillRules.filter(([, r]) => r.test(text)).map(([label]) => label);
}
export function eligibility(
  location: string,
  text: string,
): {
  geography: Geography;
  pakistanEligibility: UnifiedFinding["pakistanEligibility"];
  eligibilityEvidence: string | null;
} {
  const raw = location.trim();
  const restrictions = text
    .split("\n")
    .filter((s) =>
      /locations?:|(?:must|only|required to) (?:be |live|reside)|selected? (?:countries|Asian|markets)|work authori[sz]|visa|time.?zones?|overlap|Eastern Time|Pakistan/i.test(
        s,
      ),
    )
    .join("\n")
    .slice(0, 1800);
  const contradictory =
    /locations?:\s*(?:the )?(?:US|UK|United States|United Kingdom|Canada|Singapore)|(?:must (?:be based|live|reside) in|US.only|EU.only|only (?:US|EU))\b/i.test(
      restrictions,
    );
  let geography: Geography = /Pakistan/i.test(raw)
    ? "pakistan_eligible"
    : /^(worldwide|anywhere|global)$/i.test(raw)
      ? "worldwide"
      : /APAC|Asia.?Pacific/i.test(raw)
        ? "apac"
        : /EMEA/i.test(raw)
          ? "emea"
          : /^(USA?|United States)(?: only)?$/i.test(raw)
            ? "us_only"
            : /^(EU|European Union)(?: only)?$/i.test(raw)
              ? "eu_only"
              : raw
                ? "other_restricted"
                : "unknown";
  let pakistanEligibility: UnifiedFinding["pakistanEligibility"] = "unknown";
  if (/Pakistan/i.test(raw) && !contradictory)
    pakistanEligibility = "confirmed";
  else if (
    geography === "us_only" ||
    geography === "eu_only" ||
    (geography === "other_restricted" &&
      !/Pakistan|APAC|worldwide|anywhere/i.test(raw))
  )
    pakistanEligibility = "excluded";
  if (contradictory && geography === "worldwide") {
    geography = "other_restricted";
    pakistanEligibility = "unknown";
  }
  if (
    /(?:except|excluding|not (?:eligible|available|hiring)(?: in| from)?)\s+Pakistan|Pakistan\s+(?:excluded|not eligible)/i.test(
      raw + "\n" + text,
    )
  ) {
    pakistanEligibility = "excluded";
    geography = "other_restricted";
  }
  // Worldwide advertising and APAC membership are not confirmation of Pakistan-specific hiring/authorization.
  return {
    geography,
    pakistanEligibility,
    eligibilityEvidence: [
      raw ? `Provider candidate-location: ${raw}` : "Location not supplied",
      restrictions || null,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}
export function workArrangements(raw: string, text: string) {
  const out = new Set<Arrangement>();
  const map: Record<string, Arrangement> = {
    full_time: "full_time",
    part_time: "part_time",
    freelance: "freelance",
    contract: "contract_unspecified",
    internship: "internship",
    temporary: "temporary",
  };
  if (map[raw]) out.add(map[raw]);
  for (const [key, re] of [
    ["full_time", /\bfull[- ]time\b/i],
    ["part_time", /\bpart[- ]time\b/i],
    ["fixed_term", /\bfixed[- ]term\b/i],
    ["independent_contractor", /\bindependent contractor\b/i],
    ["freelance", /\bfreelance (?:role|project|developer|engineer)\b/i],
    ["project", /\bproject[- ]based\b|per task/i],
    ["hourly", /\b(?:paid|rate|pay)\b[^.\n]{0,30}\b(?:per hour|hourly)\b/i],
    ["retainer", /\bretainer\b/i],
    ["temporary", /\btemporary (?:role|position|contract)\b/i],
    ["internship", /\binternship\b/i],
    ["apprenticeship", /\bapprenticeship\b/i],
    ["contract_to_hire", /\bcontract[- ]to[- ]hire\b/i],
    ["fractional", /\bfractional (?:engineer|role|position|CTO)\b/i],
    [
      "agency_subcontract",
      /\b(?:agency subcontract|white[- ]label engineering)\b/i,
    ],
    ["recurring", /\blong[- ]term recurring\b/i],
  ] as [Arrangement, RegExp][])
    if (re.test(text)) out.add(key);
  return [...out].length ? [...out] : ["unknown" as const];
}
export const remotiveJob = z.object({
  id: z.number().int().positive(),
  url: z.string().max(2048),
  title: z.string().min(1).max(500),
  company_name: z.string().max(300),
  category: z.string().max(200).default(""),
  tags: z.array(z.string().max(200)).max(100).default([]),
  job_type: z.string().max(100).default(""),
  publication_date: z.string().max(100),
  candidate_required_location: z.string().max(1000).default(""),
  salary: z.string().max(2000).default(""),
  description: z.string().max(150000),
});
export const remotiveResponse = z.object({
  jobs: z.array(remotiveJob).max(2000),
});
export function normalizeRemotive(
  j: z.infer<typeof remotiveJob>,
  seenAt: string,
): UnifiedFinding {
  const text = plainText(j.description);
  const skills = matchedSkills([j.title, ...j.tags, text].join(" "));
  const engineering =
    /software|develop(?:er|ment)|(?:back|front)[- ]end|full[- ]stack|(?:head|lead|AI|cloud|security|platform|data|DevOps|service desk).*engineer|engineer.*(?:AI|software|cloud|security)/i.test(
      j.title,
    ) ||
    /(?:build|develop|implement|maintain)\b[^.\n]{0,70}\b(?:software|APIs|applications|backend|web app)/i.test(
      text,
    );
  const admin =
    /office assistant|\b(?:copywriter|content writer|freelance writer|sales contractor|account executive|video annotation)\b/i.test(
      j.title,
    );
  const relevant = engineering && skills.length > 0 && !admin;
  const date = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(j.publication_date)
    ? j.publication_date + "Z"
    : j.publication_date;
  const publishedAt = Number.isFinite(Date.parse(date))
    ? new Date(date).toISOString()
    : null;
  const age = publishedAt
    ? (Date.parse(seenAt) - Date.parse(publishedAt)) / 86400000
    : null;
  const closed =
    /\b(?:position (?:has been |is )filled|applications? (?:are |is )closed|no longer accepting applications)\b/i.test(
      text,
    );
  const deadline =
    text.match(
      /(?:application deadline|apply by|closing date)\s*:?\s*(\d{4}-\d{2}-\d{2})/i,
    )?.[1] ?? null;
  const status: UnifiedFinding["status"] = closed
    ? "closed"
    : deadline && deadline < seenAt.slice(0, 10)
      ? "expired"
      : age === null || age < 0
        ? "unknown"
        : age > 45
          ? "stale"
          : "current_unconfirmed";
  const geo = eligibility(j.candidate_required_location, text);
  const url = canonicalUrl(j.url);
  if (new URL(url).hostname !== "remotive.com")
    throw new Error("Remotive supplied an unexpected source origin.");
  const restrictions =
    text
      .split("\n")
      .filter((s) => /time.?zones?|overlap|Eastern Time/i.test(s))
      .join("\n")
      .slice(0, 1000) || null;
  const authorization =
    text
      .split("\n")
      .filter((s) => /visa|work authori[sz]|right to work|sponsorship/i.test(s))
      .join("\n")
      .slice(0, 1000) || null;
  const salary = j.salary.trim() || null;
  const currency =
    salary && /US\$|\bUSD\b/.test(salary + " " + text)
      ? "USD"
      : salary && /EUR|€/.test(salary)
        ? "EUR"
        : salary && /GBP|£/.test(salary)
          ? "GBP"
          : null;
  const missing = [
    "Qualifications and experience match need operator review",
    "Current vacancy and application availability need employer confirmation",
    geo.pakistanEligibility === "unknown"
      ? "Pakistan-specific hiring, payment and work authorization unconfirmed"
      : null,
    !salary ? "Compensation not published" : null,
    salary && !currency ? "Currency not explicit" : null,
    !deadline ? "Application deadline unknown" : null,
    !restrictions ? "Timezone overlap unknown" : null,
    !authorization ? "Visa / authorization policy unknown" : null,
    "Applicant count / competition not provided",
  ].filter((s): s is string => !!s);
  return {
    provider: "remotive",
    sourceId: String(j.id),
    url,
    urlKind: "record",
    title: j.title,
    publishedAt,
    seenAt,
    identity: j.company_name.trim()
      ? {
          kind: "organization",
          name: j.company_name.trim(),
          domain: null,
          providerId: null,
        }
      : null,
    excerpt: text.slice(0, 6000),
    evidence: {
      origin: "public_api",
      sourceUrl: "https://remotive.com/api/remote-jobs?category=software-dev",
      retrievedAt: seenAt,
      notes:
        "Remotive public API; 24-hour delayed feed. Source employer identity, salary and vacancy claims are not independently verified. No employer domain inferred from its name.",
    },
    pipeline: "job",
    demand: relevant ? "explicit_demand" : "irrelevant",
    arrangements: workArrangements(j.job_type, text),
    employmentTypeRaw: j.job_type || null,
    ...geo,
    locationRaw: j.candidate_required_location || null,
    skills,
    signal: relevant
      ? "Published engineering hiring / project listing; not a request to buy agency services."
      : null,
    route: {
      url,
      purpose: "application",
      verification:
        "Public Remotive application listing; no application submitted. Employer destination must be checked manually.",
    },
    compensation: salary,
    currency,
    seniority:
      j.title.match(
        /\b(junior|senior|mid[- ]level|entry[- ]level|lead|head)\b/i,
      )?.[0] ?? null,
    timezone: restrictions,
    authorization,
    deadline,
    competition: null,
    status,
    confidence:
      "Deterministic, source-backed classification; skills are mentioned, not verified candidate qualifications.",
    unknowns: missing,
    relevance: relevant
      ? `Engineering role mentions ${skills.join(", ")}. Qualification match is not verified.`
      : "Not a supported engineering demand; incidental technical keywords are insufficient.",
    offer:
      "Evaluate an engineering application against verified portfolio/experience; never send a client sales pitch.",
    nextAction:
      geo.pakistanEligibility === "excluded"
        ? "Do not apply unless the employer explicitly changes its geographic restriction."
        : status !== "current_unconfirmed"
          ? "Recheck vacancy status before considering an application."
          : "Open the original application listing; verify location/authorization, qualifications, compensation and requirements before applying manually.",
    worthReviewing:
      relevant &&
      geo.pakistanEligibility !== "excluded" &&
      status === "current_unconfirmed",
    saveable: relevant,
  };
}
export function countsFor(
  findings: UnifiedFinding[],
  retrieved = findings.length,
  duplicates = 0,
): RunCounts {
  return {
    retrieved,
    relevant: findings.filter((f) => f.demand !== "irrelevant").length,
    organizations: new Set(
      findings.flatMap((f) =>
        f.identity ? [`${f.identity.kind}:${f.identity.name}`] : [],
      ),
    ).size,
    routes: findings.filter((f) => f.route).length,
    pakistanConfirmed: findings.filter(
      (f) => f.pakistanEligibility === "confirmed",
    ).length,
    eligibilityUnknown: findings.filter(
      (f) => f.pakistanEligibility === "unknown",
    ).length,
    duplicates,
    worthReviewing: findings.filter((f) => f.worthReviewing).length,
  };
}
