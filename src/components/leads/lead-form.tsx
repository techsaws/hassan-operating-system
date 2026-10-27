"use client";
import { useActionState } from "react";
import Link from "next/link";
import type { Lead } from "@/db/schema";
import { statuses, services } from "@/features/leads/constants";
import { saveLead } from "@/features/leads/actions";
import type { FormState } from "@/features/leads/validation";
import { Button } from "@/components/ui/button";
export function LeadForm({ lead }: { lead?: Lead }) {
  const [state, action, pending] = useActionState(
    saveLead.bind(null, lead?.id ?? null),
    {} as FormState,
  );
  const fields = [
    ["companyName", "Company name", "text", 200],
    ["websiteUrl", "Website URL", "url", 2048],
    ["contactName", "Contact name", "text", 200],
    ["contactEmail", "Contact email", "email", 254],
    ["country", "Country", "text", 100],
    ["source", "Source", "text", 200],
    ["nextFollowUp", "Next follow-up", "date", undefined],
  ] as const;
  function errors(name: string) {
    return state.errors?.[name]?.length ? (
      <p id={`${name}-error`} className="mt-1 text-xs text-red-700">
        {state.errors[name]?.join(" ")}
      </p>
    ) : null;
  }
  return (
    <form action={action} className="panel max-w-3xl space-y-6 p-6" noValidate>
      {state.message && (
        <div
          role="alert"
          className="rounded-md bg-red-50 p-3 text-sm text-red-800"
        >
          {state.message}
        </div>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map(([name, label, type, max]) => (
          <div key={name}>
            <label htmlFor={name}>
              {label}
              {name === "companyName" ? " *" : ""}
            </label>
            <input
              id={name}
              name={name}
              type={type}
              maxLength={max}
              required={name === "companyName"}
              defaultValue={state.values?.[name] ?? lead?.[name] ?? ""}
              aria-invalid={!!state.errors?.[name]}
              aria-describedby={
                state.errors?.[name] ? `${name}-error` : undefined
              }
            />
            {errors(name)}
          </div>
        ))}
        <div>
          <label htmlFor="serviceInterest">Service interest</label>
          <select
            id="serviceInterest"
            name="serviceInterest"
            defaultValue={
              state.values?.serviceInterest ?? lead?.serviceInterest ?? ""
            }
          >
            <option value="">Unspecified</option>
            {services.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {errors("serviceInterest")}
        </div>
        <div>
          <label htmlFor="status">Status</label>
          <select
            id="status"
            name="status"
            defaultValue={state.values?.status ?? lead?.status ?? "new"}
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {errors("status")}
        </div>
      </div>
      <div>
        <label htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          name="notes"
          rows={5}
          maxLength={20000}
          defaultValue={state.values?.notes ?? lead?.notes ?? ""}
        />
        {errors("notes")}
      </div>
      <section className="space-y-4 border-t border-zinc-200 pt-5">
        <div>
          <h2 className="text-lg font-semibold">Qualification</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Record observed facts and their sources. Claims are supplied by you,
            not independently verified. Scores update when you save.
          </p>
        </div>
        <div className="rounded-md bg-zinc-50 p-4 text-sm">
          <p className="font-medium">
            Saved score: {lead?.qualificationScore ?? 0}/100
          </p>
          <p className="mt-2 whitespace-pre-line text-xs text-zinc-600">
            {lead?.qualificationExplanation ??
              "Not reviewed. Missing qualification evidence; no points awarded."}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Last reviewed:{" "}
            {lead?.lastReviewedAt
              ? new Date(lead.lastReviewedAt).toISOString().slice(0, 10)
              : "Not reviewed"}
          </p>
        </div>
        <div>
          <label htmlFor="targetService">Target service</label>
          <select
            id="targetService"
            name="targetService"
            defaultValue={
              state.values?.targetService ?? lead?.targetService ?? ""
            }
          >
            <option value="">Unspecified</option>
            {services.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {errors("targetService")}
        </div>
        {(
          [
            [
              "problemEvidence",
              "Prospect problem / evidence",
              "Describe the observed business need; do not infer it from the company industry.",
            ],
            [
              "evidenceUrl",
              "Evidence source URL",
              "Source supporting the need, service fit, contact relevance, or reachability.",
            ],
            [
              "serviceFitEvidence",
              "Service fit evidence",
              "Explain how the target service addresses the documented need.",
            ],
            [
              "contactRelevanceEvidence",
              "Contact relevance evidence",
              "Record why this named person is relevant to the decision.",
            ],
            [
              "reachabilityEvidence",
              "Reachability evidence",
              "Record where the email was published or how reachability was confirmed.",
            ],
            [
              "buyingSignalEvidence",
              "Buying signal evidence",
              "Record an explicit request, invitation, or other observed buying signal.",
            ],
            [
              "buyingSignalUrl",
              "Buying signal source URL",
              "A source for the specific buying signal.",
            ],
          ] as const
        ).map(([name, label, help]) => (
          <div key={name}>
            <label htmlFor={name}>{label}</label>
            <p id={`${name}-help`} className="mb-2 text-xs text-zinc-500">
              {help}
            </p>
            {name.endsWith("Url") ? (
              <input
                id={name}
                name={name}
                type="url"
                maxLength={2048}
                defaultValue={state.values?.[name] ?? lead?.[name] ?? ""}
                aria-invalid={!!state.errors?.[name]}
                aria-describedby={`${name}-help ${state.errors?.[name] ? `${name}-error` : ""}`}
              />
            ) : (
              <textarea
                id={name}
                name={name}
                rows={2}
                maxLength={5000}
                defaultValue={state.values?.[name] ?? lead?.[name] ?? ""}
                aria-invalid={!!state.errors?.[name]}
                aria-describedby={`${name}-help ${state.errors?.[name] ? `${name}-error` : ""}`}
              />
            )}
            {errors(name)}
          </div>
        ))}
      </section>
      <div className="flex gap-3 border-t border-zinc-200 pt-5">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : lead ? "Save changes" : "Create lead"}
        </Button>
        <Button asChild variant="outline">
          <Link href="/leads">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
