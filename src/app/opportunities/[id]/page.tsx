import { notFound } from "next/navigation";
import { z } from "zod";
import {
  getOpportunity,
  listCampaigns,
} from "@/features/opportunities/queries";
import { assessOpportunity } from "@/features/opportunities/assessment";
import { getAiConfiguration } from "@/features/ai/provider";
import { OpportunityForm } from "@/components/leads/opportunity-form";
import { OpportunityResearch } from "@/components/leads/opportunity-research";
export default async function OpportunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const opportunity = await getOpportunity(id);
  if (!opportunity) notFound();
  const assessment = assessOpportunity(opportunity);
  const ai = getAiConfiguration();
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">OPPORTUNITY RESEARCH</p>
          <h1>{opportunity.companyName || "Incomplete opportunity"}</h1>
          <p className="subtitle">
            {assessment.readiness} · {assessment.nextAction}
          </p>
          <a
            className="mt-3 inline-block text-sm text-teal-800 underline"
            href="#source-research"
          >
            Jump to source research and AI analysis
          </a>
        </div>
      </div>
      <OpportunityForm
        key={opportunity.updatedAt.toISOString()}
        opportunity={opportunity}
        campaigns={await listCampaigns()}
      />
      <OpportunityResearch
        key={`research-${opportunity.updatedAt.toISOString()}`}
        opportunity={opportunity}
        ai={{ enabled: ai.enabled, reason: ai.reason }}
      />
    </>
  );
}
