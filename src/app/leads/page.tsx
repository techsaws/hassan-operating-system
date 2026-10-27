import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { listLeads } from "@/features/leads/queries";
import { statuses } from "@/db/schema";
import { Button } from "@/components/ui/button";
export const dynamic = "force-dynamic";
export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 200) : "";
  const status = typeof params.status === "string" ? params.status : "";
  const sort = params.sort === "score" ? "score" : "newest";
  const rows = await listLeads(q, status, sort);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">CLIENT PIPELINE</p>
          <h1>Leads</h1>
          <p className="subtitle">
            Build relationships. Keep the next step in sight.
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href="/leads/import">Import CSV</Link>
          </Button>
          <Button asChild>
            <Link href="/leads/new">
              <Plus size={16} />
              Add lead
            </Link>
          </Button>
        </div>
      </div>
      <div className="panel overflow-hidden">
        <form
          className="flex flex-wrap items-end gap-3 border-b border-zinc-200 p-4"
          action="/leads"
        >
          <div className="min-w-48 flex-1">
            <label htmlFor="q">Search leads</label>
            <input
              id="q"
              name="q"
              placeholder="Company, contact, or email"
              defaultValue={q}
              maxLength={200}
            />
          </div>
          <div>
            <label htmlFor="filter-status">Status</label>
            <select id="filter-status" name="status" defaultValue={status}>
              <option value="">All statuses</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sort">Sort by</label>
            <select id="sort" name="sort" defaultValue={sort}>
              <option value="newest">Newest first</option>
              <option value="score">Highest score</option>
            </select>
          </div>
          <Button type="submit" variant="outline">
            Apply
          </Button>
          <Link href="/leads" className="p-2 text-sm text-zinc-600 underline">
            Reset
          </Link>
        </form>
        {rows.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap text-left text-sm">
                <thead>
                  <tr>
                    {[
                      "Company / contact",
                      "Email",
                      "Status",
                      "Service",
                      "Evidence completeness",
                      "Follow-up",
                      "",
                    ].map((h) => (
                      <th key={h} scope="col">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((lead) => (
                    <tr key={lead.id}>
                      <td>
                        <Link
                          className="font-medium text-zinc-900 hover:underline"
                          href={`/leads/${lead.id}/edit`}
                        >
                          {lead.companyName}
                        </Link>
                        <p className="mt-1 text-xs text-zinc-500">
                          {lead.contactName || "No contact name"}
                        </p>
                      </td>
                      <td className="text-zinc-600">
                        {lead.contactEmail || "—"}
                      </td>
                      <td>
                        <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs capitalize text-teal-900">
                          {lead.status}
                        </span>
                      </td>
                      <td className="capitalize text-zinc-600">
                        {lead.serviceInterest || "—"}
                      </td>
                      <td className="text-zinc-600">
                        <span className="font-medium">
                          {lead.qualificationScore}/100
                        </span>
                        <p className="mt-1 text-xs">
                          {lead.lastReviewedAt
                            ? lead.qualificationScore < 100
                              ? "Missing evidence"
                              : "Evidence recorded"
                            : "Not reviewed · Missing evidence"}
                        </p>
                      </td>
                      <td className="text-zinc-600">
                        {lead.nextFollowUp || "—"}
                      </td>
                      <td>
                        <Link
                          href={`/leads/${lead.id}/edit`}
                          className="font-medium text-teal-800"
                          aria-label={`Edit ${lead.companyName}`}
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="p-4 text-xs text-zinc-500">
              {rows.length} leads shown ·{" "}
              {sort === "score" ? "Highest score first" : "Newest first"} · Up
              to 500 results
            </p>
          </>
        ) : (
          <div className="px-5 py-16 text-center">
            <Users className="mx-auto mb-4 text-zinc-400" size={28} />
            <h2 className="font-semibold">
              {q || status ? "No matching leads" : "Your pipeline starts here"}
            </h2>
            <p className="mb-5 mt-2 text-sm text-zinc-500">
              {q || status
                ? "Try another search or reset your filters."
                : "Add your first company and plan the next step."}
            </p>
            <Button asChild variant="outline">
              <Link href={q || status ? "/leads" : "/leads/new"}>
                {q || status ? "Clear filters" : "Add your first lead"}
              </Link>
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
