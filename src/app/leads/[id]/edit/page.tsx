import { notFound } from "next/navigation";
import { z } from "zod";
import { getLead } from "@/features/leads/queries";
import { LeadForm } from "@/components/leads/lead-form";
export default async function EditLead({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const lead = await getLead(id);
  if (!lead) notFound();
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">LEADS</p>
          <h1>Edit lead</h1>
          <p className="subtitle">
            Update details and keep the conversation moving.
          </p>
        </div>
      </div>
      <LeadForm lead={lead} />
    </>
  );
}
