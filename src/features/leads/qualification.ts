type Evidence = {
  targetService?: string | null;
  problemEvidence?: string | null;
  evidenceUrl?: string | null;
  serviceFitEvidence?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactRelevanceEvidence?: string | null;
  reachabilityEvidence?: string | null;
  buyingSignalEvidence?: string | null;
  buyingSignalUrl?: string | null;
};
// Evidence is supplied by the operator. This never infers or independently verifies claims.
export function qualifyLead(e: Evidence) {
  const documented = Boolean(e.evidenceUrl);
  const criteria = [
    {
      name: "Service fit",
      points: 20,
      met: !!(e.targetService && e.serviceFitEvidence && documented),
      missing: "target service, fit evidence, and source URL required",
    },
    {
      name: "Business need",
      points: 30,
      met: !!(e.problemEvidence && documented),
      missing: "problem evidence and source URL required",
    },
    {
      name: "Contact relevance",
      points: 15,
      met: !!(e.contactName && e.contactRelevanceEvidence && documented),
      missing: "named contact, relevance evidence, and source URL required",
    },
    {
      name: "Reachability",
      points: 15,
      met: !!(e.contactEmail && e.reachabilityEvidence && documented),
      missing: "email, reachability evidence, and source URL required",
    },
    {
      name: "Buying signal",
      points: 20,
      met: !!(e.buyingSignalEvidence && e.buyingSignalUrl),
      missing: "explicit buying signal evidence and its source URL required",
    },
  ];
  return {
    qualificationScore: criteria.reduce(
      (sum, c) => sum + (c.met ? c.points : 0),
      0,
    ),
    qualificationExplanation: criteria
      .map(
        (c) =>
          `${c.name}: ${c.met ? c.points : 0}/${c.points} — ${c.met ? "operator-recorded evidence present" : `missing ${c.missing}`}.`,
      )
      .join("\n"),
  };
}
