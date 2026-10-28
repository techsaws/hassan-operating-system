import Link from "next/link";
import { z } from "zod";
import {
  listCampaigns,
  listOpportunities,
} from "@/features/opportunities/queries";
import { assessOpportunity } from "@/features/opportunities/assessment";
import { Button } from "@/components/ui/button";
import { CampaignCreate } from "@/components/leads/campaign-create";
import { FindLeads } from "@/components/leads/find-leads";
import { FindBusinesses } from "@/components/leads/find-businesses";
import { contactStatus } from "@/features/opportunities/contact-types";
export const dynamic = "force-dynamic";
export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string }>;
}) {
  const params = await searchParams;
  const campaign = z.uuid().safeParse(params.campaign).success
    ? params.campaign
    : undefined;
  const [campaigns, records] = await Promise.all([
    listCampaigns(),
    listOpportunities(campaign),
  ]);
  const rows = records
    .map((o) => ({ o, a: assessOpportunity(o) }))
    .sort(
      (x, y) =>
        y.a.priority - x.a.priority ||
        y.o.updatedAt.getTime() - x.o.updatedAt.getTime(),
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">ACQUISITION WORKLIST</p>
          <h1>Opportunities</h1>
          <p className="subtitle">
            Research real needs, preserve evidence, and decide the next human
            action.
          </p>
        </div>
        <Button asChild>
          <Link href="/opportunities/new">Capture opportunity / URL</Link>
        </Button>
      </div>
      <FindLeads campaigns={campaigns} />
      <FindBusinesses campaigns={campaigns} />
      <CampaignCreate />
      <form className="mb-5 flex items-end gap-3" action="/opportunities">
        <div>
          <label htmlFor="campaign-filter">Campaign</label>
          <select
            id="campaign-filter"
            name="campaign"
            defaultValue={campaign ?? ""}
          >
            <option value="">All opportunities</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>
      <div className="panel overflow-auto">
        {rows.length ? (
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                {[
                  "Opportunity / source",
                  "Attention",
                  "Evidence / signal",
                  "Next human action",
                  "",
                ].map((t) => (
                  <th key={t}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ o, a }) => (
                <tr key={o.id}>
                  <td>
                    <Link
                      className="font-medium text-teal-800 underline"
                      href={`/opportunities/${o.id}`}
                    >
                      {o.companyName ||
                        o.discovery?.title ||
                        "Company not yet identified"}
                    </Link>
                    {(o.contactResearch ||
                      o.platform?.startsWith("Overture Places")) && (
                      <p className="text-xs text-zinc-600">
                        {contactStatus(o.contactResearch)}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-zinc-500">
                      {o.platform || "Source/platform unknown"} ·{" "}
                      {campaigns.find((c) => c.id === o.campaignId)?.name ||
                        "Unassigned"}
                    </p>
                    {o.discovery && (
                      <p className="mt-1 text-xs text-zinc-500">
                        Discovery: {o.discovery.classification} ·{" "}
                        {o.discovery.availability} · Published{" "}
                        {o.discovery.publishedAt.slice(0, 10)} · Availability
                        requires recheck
                      </p>
                    )}
                    {o.sourceUrl && (
                      <p className="mt-1 max-w-64 truncate text-xs text-zinc-500">
                        {o.sourceUrl}
                      </p>
                    )}
                  </td>
                  <td>
                    {a.due
                      ? `Follow-up due ${o.followUpDate}`
                      : a.recent
                        ? "Recent dated need"
                        : o.needDate
                          ? `Need dated ${o.needDate}`
                          : "Need date unknown"}
                    <p className="mt-1 text-xs text-zinc-500">{a.readiness}</p>
                  </td>
                  <td className="max-w-xs">
                    <p>{a.signal}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {o.retrievedAt
                        ? `Text retrieved ${o.retrievedAt.toISOString().slice(0, 10)}`
                        : "Not retrieved · operator research only"}
                    </p>
                  </td>
                  <td className="max-w-xs">
                    {a.nextAction}
                    <p className="mt-1 text-xs text-zinc-500">
                      Missing:{" "}
                      {a.missing.join(", ") || "Human review still required"}
                    </p>
                  </td>
                  <td>
                    <Link
                      className="text-teal-800 underline"
                      href={
                        o.leadId
                          ? `/leads/${o.leadId}/edit`
                          : `/opportunities/${o.id}`
                      }
                    >
                      {o.leadId ? "Open lead" : "Research"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-10 text-sm text-zinc-500">
            No opportunities saved. Capture a URL or record an observed need
            manually.
          </div>
        )}
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        Up to 500 records. Due follow-ups, sourced explicit-request assertions,
        recent dated needs, and relevant contacts receive attention first.
        Campaign membership and all assertions require operator confirmation.
      </p>
    </>
  );
}
