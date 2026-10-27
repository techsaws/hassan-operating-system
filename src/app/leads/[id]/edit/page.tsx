import { notFound } from "next/navigation";
import { z } from "zod";
import { getLead } from "@/features/leads/queries";
import { LeadForm } from "@/components/leads/lead-form";
import { OutreachWorkspace } from "@/components/leads/outreach-workspace";
import { listDrafts } from "@/features/outreach/queries";
import { getAiConfiguration } from "@/features/ai/provider";
export default async function EditLead({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const lead = await getLead(id);
  if (!lead) notFound();
  const drafts = await listDrafts(id);
  const ai = getAiConfiguration();
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">LEADS</p>
          <h1>Edit lead</h1>
          <p className="subtitle">
            Update details and keep the conversation moving.
          </p>
          <a
            href="#outreach-title"
            className="mt-3 inline-block text-sm text-teal-800 underline"
          >
            Jump to outreach assistant
          </a>
        </div>
      </div>
      <LeadForm lead={lead} />
      <OutreachWorkspace
        leadId={id}
        initialDrafts={drafts}
        ai={{ enabled: ai.enabled, reason: ai.reason }}
      />
    </>
  );
}
