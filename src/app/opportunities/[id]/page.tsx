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
          <h1>
            {opportunity.companyName ||
              opportunity.discovery?.title ||
              "Incomplete opportunity"}
          </h1>
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
      {opportunity.discovery && (
        <div className="panel mb-5 max-w-3xl space-y-2 p-4 text-sm">
          <p>
            <strong>Discovery source:</strong> HN via Algolia · Published{" "}
            {opportunity.discovery.publishedAt.slice(0, 10)}
          </p>
          <p>
            {opportunity.discovery.classification} ·{" "}
            {opportunity.discovery.availability} (status at discovery; recheck
            before outreach).
          </p>
          <p>
            Company country:{" "}
            {opportunity.discovery.countryEvidence || "Not established"} ·
            Category:{" "}
            {opportunity.discovery.categoryEvidence || "Not established"}
          </p>
          {opportunity.discovery.contactRoute && (
            <a
              href={opportunity.discovery.contactRoute.url}
              className="break-all text-teal-800 underline"
              target="_blank"
              rel="noreferrer noopener"
            >
              Buyer-provided route (not independently verified):{" "}
              {opportunity.discovery.contactRoute.url}
            </a>
          )}
          <p>
            Discovery text is a source excerpt, not an operator assertion.
            Review and record the actual need, then use Qwen analysis and the
            existing CRM handoff. No lead was created automatically.
          </p>
        </div>
      )}
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
