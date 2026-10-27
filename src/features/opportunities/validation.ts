import { z } from "zod";
import { services } from "@/features/leads/constants";
const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);
export function normalizeOpportunityUrl(value: string) {
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error("Use an HTTP(S) URL without credentials.");
  url.hash = "";
  for (const key of [...url.searchParams.keys()])
    if (/^utm_|^(fbclid|gclid)$/i.test(key)) url.searchParams.delete(key);
  url.searchParams.sort();
  return url.href;
}
export const opportunityInput = z
  .object({
    companyName: optional(200),
    sourceUrl: optional(2048)
      .refine((v) => {
        try {
          if (v) normalizeOpportunityUrl(v);
          return true;
        } catch {
          return false;
        }
      }, "Enter an HTTP(S) URL without credentials.")
      .transform((v) => (v ? normalizeOpportunityUrl(v) : null)),
    platform: optional(200),
    observedNeed: optional(2000),
    operatorEvidence: optional(4000),
    contactName: optional(200),
    contactEmail: optional(254)
      .refine(
        (v) => !v || z.email().safeParse(v).success,
        "Enter a valid email.",
      )
      .transform((v) => v?.toLowerCase() ?? null),
    targetService: z
      .union([z.enum(services), z.literal("")])
      .transform((v) => v || null),
    campaignId: z.union([z.uuid(), z.literal("")]).transform((v) => v || null),
    decisionMakerEvidence: optional(2000),
    explicitRequest: z
      .enum(["yes", "no"])
      .transform((v) => (v === "yes" ? 1 : 0)),
    needDate: z
      .union([z.iso.date(), z.literal("")])
      .transform((v) => v || null),
    followUpDate: z
      .union([z.iso.date(), z.literal("")])
      .transform((v) => v || null),
  })
  .refine(
    (v) =>
      !!(v.companyName || v.sourceUrl || v.observedNeed || v.operatorEvidence),
    "Provide at least a company, URL, observed need, or evidence to save research.",
  );
export const INITIAL_CAMPAIGN = "US Small Business — AI Automation";
