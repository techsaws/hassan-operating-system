import { z } from "zod";
import { services } from "@/features/leads/constants";
export const discoveryInput = z.object({
  campaignId: z.uuid(),
  targetService: z.enum(services),
  country: z.string().trim().min(1).max(80),
  buyerCategory: z.enum(["small_business", "startup", "any"]),
  keywords: z.string().trim().max(120).default(""),
  includeUnknown: z.boolean().default(true),
});
export type DiscoveryInput = z.infer<typeof discoveryInput>;
export type Classification =
  | "explicit_request"
  | "uncertain_opportunity"
  | "informational"
  | "irrelevant";
export type Availability =
  | "current_unconfirmed"
  | "closed"
  | "expired"
  | "stale";
export type ContactRoute = {
  url: string;
  evidence: string;
  kind: "email" | "application_link";
};
export type DiscoveryMetadata = {
  source: "hn_algolia";
  itemId: string;
  title: string;
  publishedAt: string;
  classification: Classification;
  availability: Availability;
  contactRoute: ContactRoute | null;
  countryEvidence: string | null;
  categoryEvidence: string | null;
};
export type Finding = DiscoveryMetadata & {
  sourceUrl: string;
  threadId: string;
  companyName: string | null;
  excerpt: string;
  contactEmail: string | null;
  service: DiscoveryInput["targetService"];
  reasons: string[];
  missing: string[];
  matches: boolean;
  saveable: boolean;
};
export type DiscoveryReport = {
  source: string;
  checkedAt: string;
  cutoff: string;
  threads: { id: string; title: string; url: string }[];
  scanned: number;
  upstreamComments: number;
  partial: boolean;
  classifications: Record<Classification, number>;
  matching: number;
  companies: number;
  contactRoutes: number;
  worthReviewing: number;
  findings: Finding[];
  explanation: string;
};
