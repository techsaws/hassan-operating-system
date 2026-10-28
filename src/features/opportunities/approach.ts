import "server-only";
import type { Opportunity } from "@/db/schema";
import { requestLocalPlan } from "@/features/ai/provider";
import {
  validateGrounding,
  servicePositioning,
  type LeadSnapshot,
} from "@/features/ai/grounding";
import { contactStatus, usableRoute } from "./contact-types";
import { z } from "zod";
import { getOpportunity } from "./queries";
import { linkOpportunityLead } from "./mutations";
import { writeDraft } from "@/features/outreach/mutations";
import { getLead } from "@/features/leads/queries";
export async function saveReviewedApproachDraft(
  id: string,
  subject: string,
  body: string,
  approved: boolean,
) {
  z.uuid().parse(id);
  if (approved !== true)
    throw new Error("Review the message and approve saving it first.");
  z.string().trim().min(1).max(200).parse(subject);
  z.string().trim().min(1).max(10000).parse(body);
  const o = await getOpportunity(id);
  const emailRoute = o?.contactResearch?.sources.find(
    (s) => usableRoute(s.annotation) && s.annotation.routeKind === "email",
  );
  if (!o || !emailRoute)
    throw new Error(
      "Record and review an appropriate business email route first. Customer booking forms never qualify.",
    );
  const expected = emailRoute.annotation.route.toLowerCase();
  if (o.contactEmail && o.contactEmail.toLowerCase() !== expected)
    throw new Error(
      "Review the existing opportunity email; it conflicts with the reviewed route.",
    );
  if (o.leadId) {
    const lead = await getLead(o.leadId);
    if (lead?.contactEmail?.toLowerCase() !== expected)
      throw new Error(
        "Review the linked CRM email manually; it must match the reviewed route. Existing records were not overwritten.",
      );
  }
  const linked = await linkOpportunityLead(id);
  const draft = await writeDraft({
    id: null,
    leadId: linked.leadId,
    channel: "email",
    subject,
    body,
  });
  return { leadId: linked.leadId, draftId: draft.id };
}
export async function prepareResearchedApproach(
  o: Opportunity,
  planner = requestLocalPlan,
) {
  const sources = o.contactResearch?.sources ?? [];
  const workflow = sources.find(
    (s) => s.annotation.reviewed && s.annotation.workflowQuote,
  );
  const contact = sources.find(
    (s) => s.annotation.reviewed && s.annotation.name,
  );
  const route = sources.find((s) => usableRoute(s.annotation));
  const problem = sources.find(
    (s) =>
      s.annotation.reviewed &&
      s.annotation.problemConfirmed &&
      s.annotation.problemQuote,
  );
  const snapshot: LeadSnapshot = {
    companyName: o.companyName || "Unidentified business",
    websiteUrl: o.sourceUrl,
    contactName: contact?.annotation.name || null,
    contactEmail:
      route?.annotation.routeKind === "email" ? route.annotation.route : null,
    targetService: o.targetService || "automation",
    notes:
      "Research-only approach. Workflow observations do not establish pain or buying intent.",
    problemEvidence: problem?.annotation.problemQuote || "",
    serviceFitEvidence: workflow?.annotation.workflowQuote || "",
    // One evidence URL per model snapshot; do not attribute facts from another page to it.
    evidenceUrl: workflow?.url || problem?.url || null,
    buyingSignalEvidence: "",
    buyingSignalUrl: null,
    contactRelevanceEvidence: contact?.annotation.roleQuote || "",
    reachabilityEvidence: route?.annotation.routeQuote || "",
  };
  if (problem && workflow && problem.url !== workflow.url)
    snapshot.problemEvidence = "";
  if (!sources.some((s) => s.annotation.reviewed))
    throw new Error(
      "Review and save source evidence before preparing an approach.",
    );
  const plan = validateGrounding(await planner(snapshot), snapshot);
  const quote = plan.evidenceField === "none" ? null : plan.evidenceQuote;
  const body = `Hi ${snapshot.contactName || "there"},\n\nI’m Hassan, a software engineer working on ${servicePositioning[plan.service].label}. ${quote ? `Your published information says: “${quote}” ` : ""}I don’t know whether intake, scheduling or follow-up is an area you want to change. Would it be useful to compare how that handoff works, or is there someone else I should ask?\n\nBest,\nHassan`;
  return {
    summary: `${snapshot.companyName}: ${workflow ? `published workflow — ${workflow.annotation.workflowQuote}` : "no reviewed workflow recorded"}`,
    status: contactStatus(o.contactResearch),
    route: route
      ? {
          value: route.annotation.route,
          kind: route.annotation.routeKind,
          source: route.url,
          origin: route.origin,
        }
      : null,
    angle: quote
      ? `Ask about the sourced workflow without claiming an unmet need. Source: ${snapshot.evidenceUrl}`
      : "Generic permission-to-discuss question; insufficient evidence for personalization.",
    uncertainty:
      "Source claims and operator assessments are not independent confirmation. No buying signal, budget, unmet need or permission to send is established. Customer booking forms are excluded.",
    subject: `Workflow question for ${snapshot.companyName}`.slice(0, 200),
    body,
    evidence: quote,
    source: quote ? snapshot.evidenceUrl : null,
    canSaveEmail: Boolean(route?.annotation.routeKind === "email"),
  };
}
