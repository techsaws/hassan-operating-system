import { access } from "node:fs/promises";
import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { acquisitionRuns } from "@/db/schema";
import { listCampaigns } from "@/features/opportunities/queries";
import { savedFindings } from "@/features/acquisition/store";
import { AcquisitionWorkspace } from "@/components/leads/acquisition-workspace";
export const dynamic = "force-dynamic";
export default async function AcquisitionPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const [campaigns, records, runs] = await Promise.all([
    listCampaigns(),
    savedFindings(),
    getDb()
      .select()
      .from(acquisitionRuns)
      .orderBy(desc(acquisitionRuns.startedAt))
      .limit(100),
  ]);
  let overtureReady = false;
  try {
    await access(".local-research/python/overturemaps/__init__.py");
    overtureReady = true;
  } catch {}
  return (
    <AcquisitionWorkspace
      view={params.view || "discover"}
      campaigns={campaigns.map((c) => ({ id: c.id, name: c.name }))}
      records={records.map((r) => ({
        id: r.id,
        data: { ...r.data, pipeline: r.pipeline as typeof r.data.pipeline },
        entityId: r.entityId,
        legacyOpportunityId: r.legacyOpportunityId,
        firstSeen: r.firstSeen.toISOString(),
        lastSeen: r.lastSeen.toISOString(),
        aliases: r.aliases,
      }))}
      runs={runs.map((r) => ({ ...r, startedAt: r.startedAt.toISOString() }))}
      overtureReady={overtureReady}
    />
  );
}
