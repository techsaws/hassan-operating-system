import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { leadCounts } from "@/features/leads/queries";
import { statuses } from "@/db/schema";
import { Button } from "@/components/ui/button";
export const dynamic = "force-dynamic";
export default async function Overview() {
  const counts = await leadCounts();
  const total = counts.reduce((sum, row) => sum + row.count, 0);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">WORKSPACE</p>
          <h1>Overview</h1>
          <p className="subtitle">A clear view of your client pipeline.</p>
        </div>
        <Button asChild>
          <Link href="/leads/new">
            <Plus size={16} />
            Add lead
          </Link>
        </Button>
      </div>
      <section className="panel mb-7 p-6">
        <p className="text-sm text-zinc-500">Total leads</p>
        <p className="mt-2 text-4xl font-semibold tracking-tight">{total}</p>
        <Link
          href="/leads"
          className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-teal-800"
        >
          Manage your pipeline <ArrowRight size={15} />
        </Link>
      </section>
      <h2 className="mb-4 text-lg font-semibold">Pipeline by status</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {statuses.map((status) => (
          <Link
            href={`/leads?status=${status}`}
            key={status}
            className="panel p-5 hover:border-teal-600"
          >
            <p className="text-sm capitalize text-zinc-500">{status}</p>
            <p className="mt-2 text-2xl font-semibold">
              {counts.find((c) => c.status === status)?.count ?? 0}
            </p>
          </Link>
        ))}
      </div>
    </>
  );
}
