import { LeadForm } from "@/components/leads/lead-form";
export default function NewLead() {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">LEADS</p>
          <h1>Add lead</h1>
          <p className="subtitle">
            Capture an opportunity. Fields marked * are required.
          </p>
        </div>
      </div>
      <LeadForm />
    </>
  );
}
