"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Opportunity } from "@/db/schema";
import { services } from "@/features/leads/constants";
import { saveOpportunityAction } from "@/features/opportunities/actions";
import { Button } from "@/components/ui/button";
export function OpportunityForm({
  opportunity,
  campaigns,
}: {
  opportunity?: Opportunity;
  campaigns: { id: string; name: string }[];
}) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="panel max-w-3xl space-y-5 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        const input = Object.fromEntries(new FormData(e.currentTarget));
        input.explicitRequest = input.explicitRequest === "yes" ? "yes" : "no";
        setError("");
        start(async () => {
          try {
            const result = await saveOpportunityAction(
              opportunity?.id ?? null,
              input,
            );
            if (result.error) {
              setError(result.error);
              return;
            }
            router.push(`/opportunities/${result.opportunity!.id}`);
            router.refresh();
          } catch {
            setError("Connection failed. Your form is still here; retry.");
          }
        });
      }}
    >
      <p className="text-sm text-zinc-600">
        Save a URL alone or incomplete manual research. Saving does not retrieve
        a page or create a CRM lead. Blank fields remain unknown.
      </p>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2">
        {(
          [
            ["companyName", "Company name", "text", 200],
            ["sourceUrl", "Website or opportunity URL", "url", 2048],
            ["platform", "Source / platform", "text", 200],
            ["contactName", "Contact name", "text", 200],
            ["contactEmail", "Contact email", "email", 254],
            ["needDate", "Date of business need (if known)", "date", undefined],
            ["followUpDate", "Next follow-up date", "date", undefined],
          ] as const
        ).map(([key, label, type, maxLength]) => (
          <div key={key}>
            <label htmlFor={key}>{label}</label>
            <input
              id={key}
              name={key}
              type={type}
              maxLength={maxLength}
              defaultValue={opportunity?.[key] ?? ""}
            />
          </div>
        ))}
        <div>
          <label htmlFor="targetService">Target service</label>
          <select
            id="targetService"
            name="targetService"
            defaultValue={opportunity?.targetService ?? ""}
          >
            <option value="">Unknown</option>
            {services.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="campaignId">Campaign</label>
          <select
            id="campaignId"
            name="campaignId"
            defaultValue={opportunity?.campaignId ?? ""}
          >
            <option value="">Unassigned</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </fieldset>
      <fieldset disabled={pending} className="space-y-4">
        {(
          [
            [
              "observedNeed",
              "Observed business need (operator assertion)",
              2000,
            ],
            [
              "operatorEvidence",
              "Original public evidence / excerpt (operator-entered)",
              4000,
            ],
            [
              "decisionMakerEvidence",
              "Evidence that the contact is a decision-maker or relevant owner",
              2000,
            ],
          ] as const
        ).map(([key, label, maxLength]) => (
          <div key={key}>
            <label htmlFor={key}>{label}</label>
            <textarea
              id={key}
              name={key}
              rows={3}
              maxLength={maxLength}
              defaultValue={opportunity?.[key] ?? ""}
            />
          </div>
        ))}
        <label className="flex items-start gap-2 text-sm">
          <input
            className="mt-1 w-auto"
            name="explicitRequest"
            type="checkbox"
            value="yes"
            defaultChecked={opportunity?.explicitRequest === 1}
          />
          <span>
            I observed an explicit public request for technical help. This is my
            assertion; confirm it against the recorded evidence.
          </span>
        </label>
      </fieldset>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save research"}
      </Button>
    </form>
  );
}
