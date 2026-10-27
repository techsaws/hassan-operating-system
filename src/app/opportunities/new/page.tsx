import { listCampaigns } from "@/features/opportunities/queries";
import { OpportunityForm } from "@/components/leads/opportunity-form";
export const dynamic = "force-dynamic";
export default async function NewOpportunity() {
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Capture opportunity</h1>
          <p className="subtitle">
            Paste one URL or enter incomplete research. No automatic retrieval.
          </p>
        </div>
      </div>
      <OpportunityForm campaigns={await listCampaigns()} />
    </>
  );
}
