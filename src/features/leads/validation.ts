import { z } from "zod";
import { statuses, services } from "./constants";
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);
export const leadInput = z.object({
  companyName: z.string().trim().min(1, "Company name is required.").max(200),
  websiteUrl: optionalText(2048)
    .refine(
      (v) => !v || /^https?:\/\//i.test(v),
      "Use an http:// or https:// URL.",
    )
    .refine((v) => !v || URL.canParse(v), "Enter a valid URL."),
  contactName: optionalText(200),
  contactEmail: optionalText(254)
    .refine(
      (v) => !v || z.email().safeParse(v).success,
      "Enter a valid email address.",
    )
    .transform((v) => v?.toLowerCase() ?? null),
  country: optionalText(100),
  source: optionalText(200),
  serviceInterest: z
    .union([z.enum(services), z.literal("")])
    .transform((v) => v || null),
  status: z.enum(statuses),
  notes: optionalText(20000),
  nextFollowUp: z
    .union([z.iso.date(), z.literal("")])
    .transform((v) => v || null),
  targetService: z
    .union([z.enum(services), z.literal("")])
    .default("")
    .transform((v) => v || null),
  problemEvidence: optionalText(5000).default(""),
  evidenceUrl: optionalText(2048)
    .refine(
      (v) => !v || (/^https?:\/\//i.test(v) && URL.canParse(v)),
      "Enter an http:// or https:// source URL.",
    )
    .default(""),
  serviceFitEvidence: optionalText(5000).default(""),
  contactRelevanceEvidence: optionalText(5000).default(""),
  reachabilityEvidence: optionalText(5000).default(""),
  buyingSignalEvidence: optionalText(5000).default(""),
  buyingSignalUrl: optionalText(2048)
    .refine(
      (v) => !v || (/^https?:\/\//i.test(v) && URL.canParse(v)),
      "Enter an http:// or https:// buying signal source URL.",
    )
    .default(""),
});
export type FormState = {
  values?: Record<string, string>;
  errors?: Record<string, string[] | undefined>;
  message?: string;
};
