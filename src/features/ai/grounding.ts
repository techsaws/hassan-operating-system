import { z } from "zod";
import { services } from "@/features/leads/constants";
import type { Lead } from "@/db/schema";

export const planSchema = z
  .object({
    service: z.enum(services),
    evidenceField: z.enum([
      "none",
      "problemEvidence",
      "serviceFitEvidence",
      "buyingSignalEvidence",
    ]),
    evidenceQuote: z.string().max(240),
    nextAction: z.enum(["verify_need", "identify_contact", "review_outreach"]),
  })
  .strict();
export type OutreachPlan = z.infer<typeof planSchema>;
export function leadSnapshot(lead: Lead) {
  return {
    companyName: lead.companyName.slice(0, 200),
    websiteUrl: lead.websiteUrl,
    contactName: lead.contactName,
    contactEmail: lead.contactEmail,
    notes: lead.notes?.slice(0, 600) ?? "",
    targetService: lead.targetService ?? lead.serviceInterest,
    problemEvidence: lead.problemEvidence?.slice(0, 1000) ?? "",
    serviceFitEvidence: lead.serviceFitEvidence?.slice(0, 1000) ?? "",
    buyingSignalEvidence: lead.buyingSignalEvidence?.slice(0, 1000) ?? "",
    contactRelevanceEvidence:
      lead.contactRelevanceEvidence?.slice(0, 300) ?? "",
    reachabilityEvidence: lead.reachabilityEvidence?.slice(0, 300) ?? "",
    evidenceUrl: lead.evidenceUrl,
    buyingSignalUrl: lead.buyingSignalUrl,
  };
}
export type LeadSnapshot = ReturnType<typeof leadSnapshot>;
export function validateGrounding(raw: unknown, lead: LeadSnapshot) {
  const plan = planSchema.parse(raw);
  if (plan.evidenceField === "none") {
    if (plan.evidenceQuote !== "")
      throw new Error(
        "Ungrounded model output: no evidence field was selected.",
      );
  } else {
    const source =
      plan.evidenceField === "buyingSignalEvidence"
        ? lead.buyingSignalUrl
        : lead.evidenceUrl;
    if (
      !source ||
      !plan.evidenceQuote.trim() ||
      !lead[plan.evidenceField].includes(plan.evidenceQuote) ||
      plan.evidenceQuote.split(/\s+/).length > 32
    )
      throw new Error(
        "Ungrounded model output: evidence must be an exact, short quote with a supplied source URL.",
      );
  }
  // Explicit target service takes priority over speculative model selection.
  if (lead.targetService && plan.service !== lead.targetService)
    throw new Error(
      "Model output did not respect the recorded target service.",
    );
  return plan;
}
export const servicePositioning = {
  automation: {
    label: "AI and business workflow automation",
    offer: "connecting routine workflows and reducing repetitive manual work",
  },
  software: {
    label: "SaaS and web application development",
    offer: "building focused web applications around business workflows",
  },
  backend: {
    label: "backend, API, and cloud integrations",
    offer:
      "connecting systems through maintainable APIs and cloud integrations",
  },
  security: {
    label: "application security",
    offer:
      "reviewing application risks and planning practical security improvements",
  },
} as const;
export function renderSuggestions(
  plan: OutreachPlan,
  lead: LeadSnapshot,
  caseStudyUrl: string | null = null,
) {
  const positioning = servicePositioning[plan.service];
  const sourceUrl =
    plan.evidenceField === "none"
      ? null
      : plan.evidenceField === "buyingSignalEvidence"
        ? lead.buyingSignalUrl
        : lead.evidenceUrl;
  const missing = [
    !lead.targetService && "Confirm the target service before outreach.",
    !lead.serviceFitEvidence && "Document how the service fits the observed need.",
    !lead.problemEvidence && "Document the actual business need.",
    !lead.evidenceUrl && "Add a source for qualification evidence.",
    !lead.contactName && "Identify a relevant named contact.",
    !lead.contactEmail && "Find a contact email.",
    !lead.contactRelevanceEvidence && "Confirm the contact’s relevance.",
    !lead.reachabilityEvidence && "Verify how the contact can be reached.",
    (!lead.buyingSignalEvidence || !lead.buyingSignalUrl) &&
      "Record a sourced buying signal; none is verified by this tool.",
  ].filter((v): v is string => !!v);
  const intro =
    plan.evidenceField === "none"
      ? `I’m reaching out to ask whether ${positioning.label} is a current priority at ${lead.companyName}.`
      : `From the information I have about ${lead.companyName}: “${plan.evidenceQuote}”`;
  const body = `Hi ${lead.contactName || "there"},\n\n${intro}\n\nI’m Hassan, a Pakistan-based software engineer focused on ${positioning.label}. My work covers ${positioning.offer}. I’d like to understand whether this area is relevant to your current plans before suggesting a specific solution.\n\nWould a short conversation be useful? If someone else owns this area, who would be best to speak with?\n\nPortfolio: https://syedhassanali.vercel.app\n\nBest,\nHassan`;
  return {
    analysis: {
      potentialServiceFit: `${positioning.label} — a suggested discussion topic, not a verified need.`,
      businessProblem:
        plan.evidenceField === "problemEvidence"
          ? plan.evidenceQuote
          : "No sourced problem selected. Confirm the business need before outreach.",
      evidenceQuote: plan.evidenceField === "none" ? null : plan.evidenceQuote,
      evidenceField: plan.evidenceField,
      sourceUrl,
      missingInformation: missing,
      outreachAngle: `Ask whether ${positioning.offer} is relevant; do not imply an existing budget or buying intent.`,
      nextHumanAction:
        !lead.problemEvidence ||
        !lead.evidenceUrl ||
        plan.nextAction === "verify_need"
          ? "Verify the business need and source with a human."
          : !lead.contactName || plan.nextAction === "identify_contact"
            ? "Identify and confirm the relevant contact."
            : "Review the evidence and draft manually before contacting the prospect.",
    },
    email: {
      subject:
        `${plan.service === "automation" ? "Workflow automation" : plan.service === "backend" ? "API integrations" : plan.service === "security" ? "Application security" : "Web applications"} at ${lead.companyName}`.slice(
          0,
          200,
        ),
      body,
    },
    linkedin: {
      subject: "",
      body: `Hi ${lead.contactName || "there"}, I’m Hassan. I work on ${positioning.label}. Is ${positioning.offer} relevant at ${lead.companyName}? Happy to compare notes if useful. Portfolio: https://syedhassanali.vercel.app`,
    },
    caseStudyUrl,
  };
}
export type Suggestions = ReturnType<typeof renderSuggestions>;
