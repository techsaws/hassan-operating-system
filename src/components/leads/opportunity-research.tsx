"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Opportunity } from "@/db/schema";
import type { analyzeOpportunity } from "@/features/opportunities/analysis";
import {
  retrieveOpportunityAction,
  analyzeOpportunityAction,
  prepareOpportunityAction,
} from "@/features/opportunities/actions";
import { Button } from "@/components/ui/button";
export function OpportunityResearch({
  opportunity,
  ai,
}: {
  opportunity: Opportunity;
  ai: { enabled: boolean; reason: string };
}) {
  const [record, setRecord] = useState(opportunity);
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [analysis, setAnalysis] = useState<Awaited<
    ReturnType<typeof analyzeOpportunity>
  > | null>(null);
  const [origin, setOrigin] = useState<"retrieved" | "operator">(
    opportunity.retrievedEvidence ? "retrieved" : "operator",
  );
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <section
      className="panel mt-6 max-w-3xl space-y-5 p-6"
      aria-labelledby="source-research"
    >
      <h2 id="source-research" className="text-lg font-semibold">
        Source research
      </h2>
      <p className="text-sm text-zinc-600">
        Retrieval happens only when you click below. Static public HTML/text
        only; robots rules and site restrictions apply. Restricted platforms,
        logins, challenges, and unsupported pages require manual research.
      </p>
      <label className="flex items-start gap-2 text-sm">
        <input
          className="mt-1 w-auto"
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>
          I checked that this page is public and its website terms permit this
          single-page request and excerpt storage.
        </span>
      </label>
      <Button
        variant="outline"
        disabled={pending || !consent || !record.sourceUrl}
        onClick={() =>
          start(async () => {
            try {
              const result = await retrieveOpportunityAction(
                record.id,
                consent,
              );
              if (result.error) {
                setMessage(result.error);
                router.refresh();
                return;
              }
              setRecord(result.opportunity!);
              setAnalysis(null);
              setMessage(
                "Source text retrieved. Review the excerpt; retrieval does not verify the business claim.",
              );
              router.refresh();
            } catch {
              setMessage("Request failed. Continue manual research.");
            }
          })
        }
      >
        {pending ? "Working…" : "Retrieve public page"}
      </Button>
      <p className="text-xs text-zinc-500">
        Latest retrieval state: {record.retrievalStatus}.{" "}
        {record.retrievalMessage}
      </p>
      {record.retrievedAt ? (
        <div className="space-y-2 border-t border-zinc-200 pt-4">
          <h3 className="font-medium">
            Source facts — last successfully retrieved excerpt
          </h3>
          <p className="break-all text-xs">
            {record.retrievedUrl} · {new Date(record.retrievedAt).toISOString()}
          </p>
          <blockquote className="whitespace-pre-wrap border-l-2 border-zinc-300 pl-3 text-sm">
            {record.retrievedEvidence}
          </blockquote>
          <p className="text-xs text-zinc-500">
            This is an excerpt, not independent verification. Operator evidence
            above was not changed.
          </p>
        </div>
      ) : (
        <p className="text-sm text-zinc-500">
          No page has been successfully retrieved. Operator evidence is not
          source-verified.
        </p>
      )}
      <div className="space-y-3 border-t border-zinc-200 pt-4">
        <h3 className="font-medium">AI interpretation</h3>
        <p className="text-xs text-zinc-500">
          {ai.reason} Uses saved research. Missing information is never positive
          evidence.
        </p>
        <label htmlFor="evidence-origin">
          Evidence origin for this analysis
        </label>
        <select
          id="evidence-origin"
          value={origin}
          onChange={(e) => {
            setOrigin(e.target.value as "retrieved" | "operator");
            setAnalysis(null);
          }}
          disabled={pending}
        >
          <option value="operator">Operator-entered assertion / excerpt</option>
          <option value="retrieved" disabled={!record.retrievedAt}>
            Successfully retrieved public excerpt
          </option>
        </select>
        <Button
          variant="outline"
          disabled={pending || !ai.enabled}
          onClick={() =>
            start(async () => {
              try {
                const result = await analyzeOpportunityAction(
                  record.id,
                  origin,
                );
                if (result.error) {
                  setMessage(result.error);
                  return;
                }
                setAnalysis(result.analysis!);
                setMessage(
                  "AI interpretation prepared. Evidence and CRM records were not changed.",
                );
              } catch {
                setMessage("Analysis unavailable. Continue manual research.");
              }
            })
          }
        >
          Analyze opportunity
        </Button>
      </div>
      {analysis && (
        <div className="space-y-2 rounded-md bg-zinc-50 p-4 text-sm">
          <h3 className="font-semibold">
            AI inference — human review required
          </h3>
          <p>
            Evidence origin:{" "}
            {analysis.origin === "retrieved"
              ? "Retrieved text"
              : "Operator assertion"}
            {analysis.retrievedAt ? ` (${analysis.retrievedAt})` : ""}
          </p>
          <p>
            <strong>AI-selected evidence excerpt:</strong>{" "}
            {analysis.explicitNeedQuote
              ? `“${analysis.explicitNeedQuote}”`
              : "No sourced need selected; obtain evidence and a source URL."}
          </p>
          <p>
            <strong>Potential service:</strong> {analysis.potentialService}
          </p>
          <p>
            <strong>Buying signal:</strong> {analysis.buyingSignal}
          </p>
          <p>
            <strong>Missing:</strong>{" "}
            {analysis.missing.join(", ") ||
              "Review source context and confirm all recorded assertions."}
          </p>
          <p>
            <strong>Next action:</strong> {analysis.nextAction}
          </p>
          <p>
            {analysis.readiness}. {analysis.caution}
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-3 border-t border-zinc-200 pt-4">
        {record.sourceUrl && (
          <Button variant="outline" asChild>
            <a
              href={record.sourceUrl}
              target="_blank"
              rel="noreferrer noopener"
            >
              Open source for manual research
            </a>
          </Button>
        )}
        {record.leadId ? (
          <Button asChild>
            <Link href={`/leads/${record.leadId}/edit#outreach-title`}>
              Open linked CRM lead
            </Link>
          </Button>
        ) : (
          <Button
            disabled={pending || !record.companyName}
            onClick={() =>
              start(async () => {
                try {
                  const result = await prepareOpportunityAction(record.id);
                  if (result?.error) setMessage(result.error);
                } catch {
                  setMessage(
                    "Could not open the lead. Refresh to check the linked record.",
                  );
                }
              })
            }
          >
            Create / link CRM lead for human review
          </Button>
        )}
      </div>
      <p className="text-xs text-zinc-500">
        Matching contact emails link existing leads without overwriting them.
        New leads stay in “new” status. Complete missing research before
        preparing or sending outreach.
      </p>
      {message && (
        <p role="status" className="text-sm text-zinc-700">
          {message}
        </p>
      )}
    </section>
  );
}
