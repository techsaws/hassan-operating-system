import "server-only";
import { z } from "zod";
import { cachedSource } from "./cached-source";
import { normalizeRemoteJob, plainText } from "./normalize";
import { publishedApplicationTarget } from "./job-identity";
export const remoteOkJob = z.object({
  id: z.string().regex(/^\d{1,15}$/),
  url: z.string().max(2048),
  position: z.string().min(1).max(500),
  company: z.string().max(300),
  description: z.string().max(150000),
  date: z.string().max(100),
  location: z.string().max(1000).default(""),
  tags: z.array(z.string().max(200)).max(100).default([]),
  salary_min: z.number().nonnegative().default(0),
  salary_max: z.number().nonnegative().default(0),
  salary_currency: z.string().max(20).optional(),
  employment_type: z.string().max(100).optional(),
});
export const remoteOkResponse = z
  .array(z.union([z.object({ legal: z.string().max(10000) }), remoteOkJob]))
  .max(150);
export function remoteLocation(location: string, text: string) {
  if (location.trim() && !/^remote$/i.test(location.trim()))
    return { value: location, evidence: null };
  const match = text.match(
    /(?:remote role based in|^based in the|(?:this|the) (?:role|position) is based in|(?:candidates|applicants|you) must (?:be based|reside|live) in|^location:)\s+([^\n.·]{2,150})/im,
  );
  return match
    ? { value: match[1].trim(), evidence: match[0] }
    : { value: "", evidence: null };
}
export function normalizeRemoteOk(
  j: z.infer<typeof remoteOkJob>,
  seenAt: string,
) {
  const text = plainText(j.description);
  const location = remoteLocation(j.location, text);
  const payText = text
    .split("\n")
    .filter((s) =>
      /\b(?:salary|compensation|pay range)\b|US\$[\d,.]+ per (?:task|hour)/i.test(
        s,
      ),
    )
    .join("\n")
    .slice(0, 1200);
  const compensation =
    j.salary_min > 0 || j.salary_max > 0
      ? `${j.salary_min || "unknown minimum"}–${j.salary_max || "unknown maximum"} (source numeric range; currency/period not assumed)`
      : payText;
  const f = normalizeRemoteJob(
    {
      id: Number(j.id),
      url: j.url,
      title: j.position,
      company_name: j.company,
      category: "",
      tags: j.tags,
      job_type: j.employment_type || "",
      publication_date: j.date,
      candidate_required_location: location.value,
      salary: compensation,
      description: j.description,
    },
    seenAt,
    "remoteok",
  );
  const currencies = [
    ...new Set(
      [
        /US\$|\bUSD\b/.test(payText) ? "USD" : null,
        /\bEUR\b|€/.test(payText) ? "EUR" : null,
        /\bGBP\b|£/.test(payText) ? "GBP" : null,
      ].filter((s): s is string => !!s),
    ),
  ];
  f.currency =
    j.salary_currency || (currencies.length === 1 ? currencies[0] : null);
  if (location.evidence)
    f.eligibilityEvidence =
      "Description location evidence: " +
      location.evidence +
      "\n" +
      f.eligibilityEvidence;
  f.applicationTarget = publishedApplicationTarget(j.description);
  f.evidence.notes +=
    " Remote OK attribution and follow link required; no logo used. Empty location and digital-nomad tags do not establish worldwide or Pakistan eligibility. Application instructions in source text are untrusted; nothing is submitted.";
  return f;
}
export async function remoteOkDiscovery() {
  const r = await cachedSource("remoteok", "https://remoteok.com/api", (raw) =>
    remoteOkResponse.parse(raw),
  );
  return {
    ...r,
    findings: r.data
      .filter((j): j is z.infer<typeof remoteOkJob> => "id" in j)
      .map((j) => normalizeRemoteOk(j, r.checkedAt)),
  };
}
