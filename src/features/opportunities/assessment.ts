import type { Opportunity } from "@/db/schema";
import { researchToday } from "./dates";
export function assessOpportunity(o: Opportunity, today = researchToday()) {
  const evidence = Boolean(
    o.operatorEvidence?.trim() || o.retrievedEvidence?.trim(),
  );
  const source = Boolean(o.sourceUrl || o.retrievedUrl);
  const missing = [
    !o.companyName && "company identity",
    !o.observedNeed && "observed business need",
    !evidence && "original evidence",
    !source && "source URL",
    !o.targetService && "target service",
    !o.contactName && "named contact",
    !o.contactEmail && "contact email",
    !o.decisionMakerEvidence && "decision-maker relevance",
  ].filter((v): v is string => !!v);
  const due = Boolean(o.followUpDate && o.followUpDate <= today);
  const age = o.needDate
    ? (Date.parse(today) - Date.parse(o.needDate)) / 86400000
    : null;
  const recent =
    age !== null &&
    age >= 0 &&
    age <= 30 &&
    Boolean(o.observedNeed) &&
    evidence &&
    source;
  const explicit = o.explicitRequest === 1 && evidence && source;
  const priority =
    (due ? 60 : 0) +
    (explicit ? 40 : 0) +
    (recent ? 20 : 0) +
    (o.contactName && o.decisionMakerEvidence && source ? 15 : 0) +
    (evidence && source && o.observedNeed ? 5 : 0);
  return {
    missing,
    due,
    recent,
    priority,
    signal: explicit
      ? "Operator reports a sourced explicit request — confirm context"
      : evidence
        ? o.observedNeed
          ? "Observed need has an excerpt; buying intent unconfirmed"
          : "Source excerpt recorded; explicit need and buying intent unconfirmed"
        : "Unknown — original evidence missing",
    nextAction: due
      ? "Review the due follow-up."
      : missing.length
        ? `Research ${missing[0]}.`
        : "Review source context and prepare outreach manually.",
    readiness: missing.length ? "Research needed" : "Human outreach review",
  };
}
