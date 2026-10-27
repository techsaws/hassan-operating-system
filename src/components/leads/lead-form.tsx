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
