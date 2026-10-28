"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  findBusinessesAction,
  saveBusinessAction,
} from "@/features/discovery/business-actions";
import {
  workflowQuestion,
  type BusinessInput,
  type BusinessReport,
} from "@/features/discovery/business-types";

export function FindBusinesses({
  campaigns,
}: {
  campaigns: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState<BusinessInput>({
    area: "raleigh",
    trade: "all",
  });
  const [campaign, setCampaign] = useState(
    campaigns.find((c) => c.name === "US Small Business — AI Automation")?.id ??
      campaigns[0]?.id ??
      "",
  );
  const [report, setReport] = useState<BusinessReport | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  return (
    <section className="panel mb-5 space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Discover home-service businesses</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Free Overture Places data. Research candidates; no established
            buying intent.
          </p>
        </div>
        <Button onClick={() => setOpen(!open)}>
          {open ? "Close business discovery" : "Find Businesses"}
        </Button>
      </div>
      {open && (
        <>
          <p className="text-sm text-zinc-600">
            US HVAC, plumbing and electrical category records. No business names
            required. Company size, residential focus, official websites and
            public contact routes require review. The source can contain stale
            records, chains and industrial contractors. No websites are
            automatically fetched.
          </p>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              start(async () => {
                try {
                  const r = await findBusinessesAction(input);
                  if (r.error) {
                    setError(r.error);
                    return;
                  }
                  setReport(r.report!);
                  setSaved({});
                } catch {
                  setError("Discovery failed. No businesses were saved.");
                }
              });
            }}
          >
            <fieldset disabled={pending} className="grid gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="business-campaign">
                  Campaign for selected saves
                </label>
                <select
                  id="business-campaign"
                  value={campaign}
                  onChange={(e) => setCampaign(e.target.value)}
                >
                  <option value="">Select a campaign</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="business-area">US research area</label>
                <select
                  id="business-area"
                  value={input.area}
                  onChange={(e) =>
                    setInput({
                      ...input,
                      area: e.target.value as BusinessInput["area"],
                    })
                  }
                >
                  <option value="raleigh">Raleigh / Apex, NC area</option>
                  <option value="austin">Austin, TX area</option>
                  <option value="tampa">Tampa, FL area</option>
                </select>
              </div>
              <div>
                <label htmlFor="business-trade">Business trade</label>
                <select
                  id="business-trade"
                  value={input.trade}
                  onChange={(e) =>
                    setInput({
                      ...input,
                      trade: e.target.value as BusinessInput["trade"],
                    })
                  }
                >
                  <option value="all">HVAC, plumbing and electrical</option>
                  <option value="hvac">HVAC</option>
                  <option value="plumbing">Plumbing</option>
                  <option value="electrical">Electrical</option>
                </select>
              </div>
            </fieldset>
            <Button disabled={pending}>
              {pending ? "Working…" : "Discover businesses"}
            </Button>
            <p className="text-xs text-zinc-500">
              Up to 20 records; allow up to two minutes. One run per minute.
              Source snapshots can be saved for 10 minutes, then run again.
              Proposed service: business / AI automation.
            </p>
          </form>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          {report && (
            <div className="space-y-3" aria-live="polite">
              <p className="text-sm">
                {report.businesses.length} catalogue records ·{" "}
                {report.input.area} / {report.input.trade} · release{" "}
                {report.release} · retrieved {report.checkedAt.slice(0, 19)}{" "}
                UTC.{" "}
                {report.limited
                  ? "Bounded sample; not an exhaustive list."
                  : "Returned records in the selected area."}
              </p>
              {!report.businesses.length && (
                <p>
                  No matching businesses found. Try another area or trade; this
                  is a source coverage failure, not evidence of absent demand.
                </p>
              )}
              <p className="text-xs text-zinc-600">
                Coverage is not qualification. Documented automation needs: not
                assessed. Explicit buying requests: not established. No calls,
                forms or messages are sent. Operator approval remains required
                before outreach.
              </p>
              {report.businesses.map((b) => (
                <article
                  key={b.id}
                  className="rounded border border-zinc-200 p-4 text-sm space-y-2"
                >
                  <h3 className="font-semibold">{b.name}</h3>
                  <p>
                    {b.city ?? "City unknown"}, {b.region ?? "State unknown"},
                    US (catalogue) · {b.category}
                  </p>
                  <p>
                    Operating status (source): {b.status ?? "unknown"} ·
                    Existence confidence:{" "}
                    {b.confidence === null
                      ? "unknown"
                      : b.confidence.toFixed(2)}
                    ; not a qualification score.
                  </p>
                  <p>
                    Source-listed website — ownership and current availability
                    unverified:{" "}
                    {b.websites.length
                      ? b.websites.map((w) => (
                          <a
                            key={w}
                            href={w}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mr-3 break-all text-teal-800 underline"
                          >
                            {w}
                          </a>
                        ))
                      : "missing"}
                  </p>
                  <p>
                    Source-listed business phone — not called or independently
                    verified: {b.phones.join(", ") || "missing"}
                  </p>
                  <p className="text-zinc-600">{workflowQuestion}</p>
                  <p>
                    Missing: actual operational problem, buying signal, budget,
                    decision-maker and company size; verify residential service
                    fit and contact ownership
                    {!b.websites.length ? ", official website" : ""}
                    {!b.phones.length ? ", public contact route" : ""}.
                  </p>
                  <details>
                    <summary className="cursor-pointer text-teal-800">
                      Source and provenance
                    </summary>
                    <p className="break-all">GERS: {b.id}</p>
                    <a
                      className="text-teal-800 underline"
                      href={`https://stac.overturemaps.org/${report.release}/collections.parquet`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Official release catalogue index (not a company profile)
                    </a>
                    <p>
                      {b.sources
                        .map(
                          (s) =>
                            `${s.dataset ?? "unknown"} / ${s.license ?? "unknown"} / updated ${s.updateTime ?? "unknown"}`,
                        )
                        .join("; ")}
                    </p>
                  </details>
                  {saved[b.id] ? (
                    <Link
                      href={`/opportunities/${saved[b.id]}`}
                      className="text-teal-800 underline"
                    >
                      Open saved research
                    </Link>
                  ) : (
                    <Button
                      variant="outline"
                      disabled={
                        pending ||
                        !campaign ||
                        Boolean(b.status && /closed/i.test(b.status))
                      }
                      onClick={() => {
                        setError("");
                        start(async () => {
                          try {
                            const r = await saveBusinessAction(
                              report.token,
                              b.id,
                              campaign,
                            );
                            if (r.error) {
                              setError(r.error);
                              return;
                            }
                            setSaved((s) => ({ ...s, [b.id]: r.saved!.id }));
                          } catch {
                            setError(
                              "Save failed. Check connection and retry.",
                            );
                          }
                        });
                      }}
                    >
                      Save for review
                    </Button>
                  )}
                </article>
              ))}
            </div>
          )}
          <p className="text-xs text-zinc-500">
            Data:{" "}
            <a
              className="underline"
              href="https://docs.overturemaps.org/guides/places/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Overture Maps Foundation, Places
            </a>
            .{" "}
            <a
              className="underline"
              href="https://docs.overturemaps.org/attribution/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Provider attribution and licences
            </a>
            . Keep applicable licence/attribution if redistributing records.
            Saved research uses the existing evidence, Qwen and CRM workflow; no
            CRM lead is created automatically.
          </p>
        </>
      )}
    </section>
  );
}
