import "server-only";
import type { Opportunity } from "@/db/schema";
import { requestLocalPlan } from "@/features/ai/provider";
import { servicePositioning, type LeadSnapshot } from "@/features/ai/grounding";
import { assessOpportunity } from "./assessment";
export async function analyzeOpportunity(
  o: Opportunity,
  origin: "retrieved" | "operator",
) {
  const evidence =
    origin === "retrieved" ? o.retrievedEvidence : o.operatorEvidence;
  const sourceUrl = origin === "retrieved" ? o.retrievedUrl : o.sourceUrl;
  if (!evidence?.trim())
    throw new Error(
      "Record evidence for the selected origin before analyzing.",
    );
  if (origin === "retrieved" && !o.retrievedAt)
    throw new Error(
      "No successfully retrieved source is available. Use operator evidence.",
    );
  const snapshot: LeadSnapshot = {
    companyName: o.companyName || "",
    websiteUrl: o.sourceUrl,
    contactName: o.contactName,
    contactEmail: o.contactEmail,
    notes:
      `Operator-observed need (unverified assertion): ${o.observedNeed ?? ""}`.slice(
        0,
        600,
      ),
    targetService: o.targetService,
    problemEvidence: evidence.slice(0, 1000),
    evidenceUrl: sourceUrl,
    serviceFitEvidence: "",
    buyingSignalEvidence: o.explicitRequest ? evidence.slice(0, 1000) : "",
    buyingSignalUrl: o.explicitRequest ? sourceUrl : null,
    contactRelevanceEvidence: o.decisionMakerEvidence ?? "",
    reachabilityEvidence: "",
  };
  const plan = await requestLocalPlan(snapshot);
  const assessment = assessOpportunity(o);
  return {
    origin,
    sourceUrl,
    retrievedAt: origin === "retrieved" ? o.retrievedAt?.toISOString() : null,
    explicitNeedQuote:
      plan.evidenceField === "none" ? null : plan.evidenceQuote,
    potentialService: o.observedNeed
      ? servicePositioning[plan.service].label
      : "Not established — identify and record an explicit business need first.",
    buyingSignal: assessment.signal,
    missing: assessment.missing,
    nextAction: assessment.nextAction,
    readiness: assessment.readiness,
    caution:
      "AI service matching is an inference. A retrieved excerpt proves retrieval only; operator assertions and buying intent still need human confirmation. No evidence, CRM record, or score was overwritten.",
  };
}
