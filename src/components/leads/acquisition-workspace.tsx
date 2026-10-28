"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  sourceCategories,
  sourceRegistry,
} from "@/features/acquisition/registry";
import {
  arrangements,
  providerIds,
  geographies,
  pipelines,
  emptyFilters,
  filterFinding,
  type UnifiedFinding,
  type UnifiedReport,
  type AcquisitionQuery,
  type FindingFilter,
  type RunCounts,
} from "@/features/acquisition/types";
import {
  acquisitionDiscoveryAction,
  saveAcquisitionAction,
} from "@/features/acquisition/actions";
type Saved = {
  id: string;
  data: UnifiedFinding;
  entityId: string | null;
  legacyOpportunityId: string | null;
  firstSeen: string;
  lastSeen: string;
  aliases: {
    provider: string;
    sourceId: string;
    url: string;
    seenAt: string;
  }[];
};
type Run = {
  id: string;
  provider: string;
  startedAt: string;
  success: number;
  networkAttempt: number;
  counts: RunCounts | null;
  error: string | null;
};
const views = [
  ["sources", "Sources"],
  ["discover", "Discover"],
  ["opportunities", "Opportunities"],
  ["clients", "Clients"],
  ["jobs", "Remote Jobs"],
  ["partnerships", "Agency Partnerships"],
  ["research", "Research"],
] as const;
const sourceNames = {
  overture: "Overture",
  hn: "HN / Algolia",
  remotive: "Remotive",
  agencies: "Pick an Agency",
  remoteok: "Remote OK",
};
const pipelineName = {
  client: "Client acquisition",
  job: "Remote job / engineering project",
  partnership: "Agency partnership hypothesis",
  research: "Research only",
};
function Filters({
  value,
  onChange,
}: {
  value: FindingFilter;
  onChange: (v: FindingFilter) => void;
}) {
  const options: [keyof FindingFilter, string, readonly string[]][] = [
    ["provider", "Source", providerIds],
    ["pipeline", "Opportunity type", pipelines],
    ["arrangement", "Work arrangement", arrangements],
    ["geography", "Remote geography", geographies],
    [
      "status",
      "Status",
      ["current_unconfirmed", "unknown", "stale", "expired", "closed"],
    ],
    ["freshness", "Published within days", ["7", "30", "90"]],
  ];
  return (
    <fieldset className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {options.map(([key, label, values]) => (
        <div key={key}>
          <label htmlFor={`acq-filter-${key}`}>{label}</label>
          <select
            id={`acq-filter-${key}`}
            value={value[key]}
            onChange={(e) => onChange({ ...value, [key]: e.target.value })}
          >
            <option value="">All / unknown included</option>
            {values.map((v) => (
              <option key={v} value={v}>
                {v.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>
      ))}
      <div>
        <label htmlFor="acq-skill-filter">Relevant skill</label>
        <input
          id="acq-skill-filter"
          placeholder="Python, React, cloud…"
          value={value.skill}
          onChange={(e) => onChange({ ...value, skill: e.target.value })}
        />
      </div>
    </fieldset>
  );
}
function FindingCard({
  f,
  children,
}: {
  f: UnifiedFinding;
  children?: React.ReactNode;
}) {
  return (
    <article className="panel space-y-3 p-5 text-sm">
      <div>
        <p className="text-xs text-zinc-500">
          {"Source: " + sourceNames[f.provider]} · {pipelineName[f.pipeline]} ·{" "}
          {f.demand.replaceAll("_", " ")} · {f.status.replaceAll("_", " ")}
        </p>
        <h3 className="mt-1 text-base font-semibold">{f.title}</h3>
        <p>{f.identity?.name || "Identity not established"}</p>
      </div>
      <p>
        <strong>Why relevant:</strong> {f.relevance}
      </p>
      <p>
        <strong>What Hassan can offer / evaluate:</strong> {f.offer}
      </p>
      <p>
        <strong>Next:</strong> {f.nextAction}
      </p>
      <p>
        Published: {f.publishedAt?.slice(0, 10) || "unknown"} · source
        retrieved: {f.seenAt.slice(0, 19)} UTC. Status is a source snapshot;
        recheck before acting.
      </p>
      {f.pipeline === "job" && (
        <div className="space-y-1 rounded border border-zinc-200 p-3">
          <p>
            Work arrangements: {f.arrangements.join(", ").replaceAll("_", " ")}{" "}
            · provider employment type: {f.employmentTypeRaw || "unknown"}
          </p>
          <p>
            Remote geography: {f.geography.replaceAll("_", " ")} · Pakistan
            eligibility: <strong>{f.pakistanEligibility}</strong>
          </p>
          <p>
            Provider location: {f.locationRaw || "unknown"}. Worldwide/APAC does
            not confirm Pakistan-specific hiring or authorization.
          </p>
          <p>
            Compensation as published: {f.compensation || "unknown"} · currency:{" "}
            {f.currency || "unknown"} · title seniority indicator:{" "}
            {f.seniority || "unknown"}
          </p>
          <p>
            Timezone: {f.timezone || "unknown"} · Authorization/visa:{" "}
            {f.authorization || "unknown"}
          </p>
          <p>
            Deadline: {f.deadline || "unknown"} · Competition/applicants:{" "}
            {f.competition || "not supplied"}
          </p>
          {f.eligibilityEvidence && (
            <details>
              <summary className="cursor-pointer">
                Geography evidence / restrictions
              </summary>
              <p className="whitespace-pre-wrap">{f.eligibilityEvidence}</p>
            </details>
          )}
        </div>
      )}
      {f.agency && (
        <div className="rounded border p-3 space-y-1">
          <p>
            Agency location (directory): {f.agency.city || "unknown"},{" "}
            {f.agency.country || "unknown"}.
          </p>
          <p>Published services: {f.agency.services.join(", ")}.</p>
          <p>
            Team size (directory assertion): {f.agency.teamSize || "unknown"};
            leadership, appropriate partnership route and partnership demand:
            not established.
          </p>
          {f.agency.qualityFlags.map((flag) => (
            <p key={flag}>{flag}</p>
          ))}
        </div>
      )}
      <p>
        <strong>Missing:</strong> {f.unknowns.join("; ")}
      </p>
      <details>
        <summary className="cursor-pointer text-teal-800">
          Original evidence and provenance
        </summary>
        <blockquote className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap border-l-2 pl-3">
          {f.excerpt}
        </blockquote>
        <p className="mt-2 break-all">
          {f.evidence.origin} · {f.evidence.sourceUrl} ·{" "}
          {f.evidence.retrievedAt}
        </p>
        <p>{f.evidence.notes}</p>
        <p>{f.confidence}</p>
      </details>
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={f.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-teal-800 underline"
        >
          {f.urlKind === "catalogue"
            ? "Original catalogue index (not a company page)"
            : f.provider === "remotive"
              ? "Original Remotive listing"
              : f.provider === "remoteok"
                ? "Original Remote OK listing"
                : f.provider === "agencies"
                  ? "Original Pick an Agency profile"
                  : "Original source"}
        </a>
        {f.route && f.route.url !== f.url && (
          <a
            href={f.route.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-800 underline"
          >
            {f.route.purpose.replaceAll("_", " ")} route
          </a>
        )}
        {children}
      </div>
      {f.route && (
        <p className="text-xs text-zinc-500">
          Route purpose: {f.route.purpose.replaceAll("_", " ")}.{" "}
          {f.route.verification}
        </p>
      )}
    </article>
  );
}
export function AcquisitionWorkspace({
  view,
  campaigns,
  records,
  runs,
  overtureReady,
}: {
  view: string;
  campaigns: { id: string; name: string }[];
  records: Saved[];
  runs: Run[];
  overtureReady: boolean;
}) {
  const active = views.some(([key]) => key === view) ? view : "discover";
  const [query, setQuery] = useState<AcquisitionQuery>({
    provider: "agencies",
    area: "raleigh",
    trade: "all",
    campaignId: "",
    targetService: "automation",
    keywords: "",
  });
  const [filters, setFilters] = useState(emptyFilters);
  const [report, setReport] = useState<UnifiedReport | null>(null);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState<
    Record<
      string,
      {
        id: string;
        legacyOpportunityId: string | null;
        pipeline: (typeof pipelines)[number];
      }
    >
  >({});
  const [selection, setSelection] = useState<
    Record<string, (typeof pipelines)[number]>
  >({});
  const [reviewableOnly, setReviewableOnly] = useState(true);
  const viewPipeline =
    active === "clients"
      ? "client"
      : active === "jobs"
        ? "job"
        : active === "partnerships"
          ? "partnership"
          : active === "research"
            ? "research"
            : null;
  const candidates = (
    active === "discover"
      ? report?.findings || []
      : records
          .filter((r) => !viewPipeline || r.data.pipeline === viewPipeline)
          .map((r) => r.data)
  ).filter(
    (f) =>
      filterFinding(f, filters) &&
      (!reviewableOnly || active !== "discover" || f.worthReviewing),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">PERSONAL ACQUISITION</p>
          <h1>Acquisition</h1>
          <p className="subtitle">
            Source-linked client research, engineering work and partnership
            hypotheses. No applications or messages sent.
          </p>
        </div>
      </div>
      <nav
        aria-label="Acquisition workspace"
        className="mb-5 flex flex-wrap gap-x-5 gap-y-2 border-b pb-3 text-sm"
      >
        {views.map(([key, label]) => (
          <Link
            key={key}
            href={`/acquisition?view=${key}`}
            aria-current={active === key ? "page" : undefined}
            className={
              active === key
                ? "font-semibold text-teal-800 underline"
                : "text-zinc-600"
            }
          >
            {label}
          </Link>
        ))}
      </nav>
      {active === "sources" ? (
        <div className="space-y-4">
          <p className="text-sm">
            Categories: {sourceCategories.join(" · ")}. Future providers are
            registry entries, not connected integrations. Yield measures source
            coverage, not customers or jobs won.
          </p>
          {sourceRegistry.map((s) => {
            const recent = runs.find((r) => r.provider === s.id),
              success = runs.find(
                (r) => r.provider === s.id && r.success === 1,
              );
            const state =
              s.id === "overture" && !overtureReady
                ? "setup required"
                : success
                  ? "connected"
                  : s.status.replaceAll("_", " ");
            return (
              <article key={s.id} className="panel space-y-2 p-4 text-sm">
                <h2 className="font-semibold">
                  {s.name} · {state}
                </h2>
                <p>
                  {s.category} · {s.method}
                </p>
                <p>Credentials: {s.credentials}</p>
                <p>Setup: {s.setup}</p>
                <p>Permitted use / retention: {s.usage}</p>
                {s.terms && (
                  <a
                    href={s.terms}
                    className="text-teal-800 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Official provider terms / documentation
                  </a>
                )}
                <p>
                  Last successful run: {success?.startedAt || "not recorded"} ·
                  latest error: {recent?.error || "none recorded"}
                </p>
                {success?.counts ? (
                  <p>
                    Last yield: {success.counts.retrieved} retrieved;{" "}
                    {success.counts.relevant} relevant/contextual findings;{" "}
                    {success.counts.organizations} identifiable organizations;{" "}
                    {success.counts.routes} published routes (purpose still
                    needs review);{" "}
                    {success.counts.explicitDemand ?? "not recorded"} explicit
                    demand; {success.counts.pakistanConfirmed} Pakistan
                    confirmed; {success.counts.eligibilityUnknown} eligibility
                    unknown; {success.counts.duplicates} duplicates;{" "}
                    {success.counts.worthReviewing} worth reviewing.
                  </p>
                ) : (
                  <p>
                    No application run/yield recorded. No connection or
                    usefulness claim.
                  </p>
                )}
                {s.id === "official_websites" && (
                  <Link
                    href="/opportunities"
                    className="text-teal-800 underline"
                  >
                    Open existing source/contact research
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="space-y-5">
          {active === "discover" && (
            <form
              className="panel space-y-4 p-5"
              onSubmit={(e) => {
                e.preventDefault();
                setMessage("");
                start(async () => {
                  try {
                    const r = await acquisitionDiscoveryAction(query);
                    if (r.error) {
                      setMessage(r.error);
                      return;
                    }
                    setReport(r.report!);
                    setSaved({});
                    setSelection({});
                  } catch {
                    setMessage("Discovery failed; no findings were saved.");
                  }
                });
              }}
            >
              <h2 className="font-semibold">
                Discover without prospect names or job URLs
              </h2>
              <fieldset
                disabled={pending}
                className="grid gap-3 sm:grid-cols-2"
              >
                <div>
                  <label htmlFor="acq-provider">Working source</label>
                  <select
                    id="acq-provider"
                    value={query.provider}
                    onChange={(e) =>
                      setQuery({
                        ...query,
                        provider: e.target
                          .value as AcquisitionQuery["provider"],
                      })
                    }
                  >
                    <option value="agencies">
                      Pick an Agency — agency partnerships
                    </option>
                    <option value="remoteok">
                      Remote OK — complementary remote work
                    </option>
                    <option value="remotive">
                      Remotive — remote engineering work
                    </option>
                    <option value="overture">
                      Overture — business research
                    </option>
                    <option value="hn">HN — freelance buyer requests</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="acq-campaign">
                    Campaign for business / HN research handoff
                  </label>
                  <select
                    id="acq-campaign"
                    value={query.campaignId}
                    onChange={(e) =>
                      setQuery({ ...query, campaignId: e.target.value })
                    }
                  >
                    <option value="">
                      {query.provider === "agencies"
                        ? "Default agency partnership campaign"
                        : "No legacy research handoff"}
                    </option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                {query.provider === "overture" && (
                  <>
                    <div>
                      <label htmlFor="acq-area">Research area</label>
                      <select
                        id="acq-area"
                        value={query.area}
                        onChange={(e) =>
                          setQuery({
                            ...query,
                            area: e.target.value as AcquisitionQuery["area"],
                          })
                        }
                      >
                        <option value="raleigh">Raleigh / Apex</option>
                        <option value="austin">Austin</option>
                        <option value="tampa">Tampa</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="acq-trade">Trade</label>
                      <select
                        id="acq-trade"
                        value={query.trade}
                        onChange={(e) =>
                          setQuery({
                            ...query,
                            trade: e.target.value as AcquisitionQuery["trade"],
                          })
                        }
                      >
                        <option value="all">
                          HVAC / plumbing / electrical
                        </option>
                        <option value="hvac">HVAC</option>
                        <option value="plumbing">Plumbing</option>
                        <option value="electrical">Electrical</option>
                      </select>
                    </div>
                  </>
                )}
                {query.provider === "hn" && (
                  <>
                    <div>
                      <label htmlFor="acq-target">Target service</label>
                      <select
                        id="acq-target"
                        value={query.targetService}
                        onChange={(e) =>
                          setQuery({
                            ...query,
                            targetService: e.target
                              .value as AcquisitionQuery["targetService"],
                          })
                        }
                      >
                        {["automation", "software", "backend", "security"].map(
                          (s) => (
                            <option key={s}>{s}</option>
                          ),
                        )}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="acq-keywords">Optional HN keywords</label>
                      <input
                        id="acq-keywords"
                        value={query.keywords}
                        maxLength={120}
                        onChange={(e) =>
                          setQuery({ ...query, keywords: e.target.value })
                        }
                      />
                    </div>
                  </>
                )}
              </fieldset>
              <Button disabled={pending}>
                {pending ? "Discovering…" : "Discover opportunities"}
              </Button>
              <p className="text-xs text-zinc-500">
                Explicit runs only. Overture may take two minutes. Remotive
                cache: six hours; max four network attempts/day; feed delayed 24
                hours. Agency data uses the default Agency Partnerships campaign
                unless another is selected. No names required. Nothing is saved
                until selected.
              </p>
            </form>
          )}
          {active !== "discover" && (
            <p className="text-sm">
              Selected saved findings only (up to 500). Source snapshots are not
              continuously refreshed.{" "}
              <Link className="text-teal-800 underline" href="/leads">
                Existing CRM leads
              </Link>{" "}
              ·{" "}
              <Link className="text-teal-800 underline" href="/opportunities">
                Existing research, Qwen and drafts handoff
              </Link>
              . Jobs remain applications, never client sales leads. Partnership
              classification is a research hypothesis until demand is sourced.
            </p>
          )}
          {report && active === "discover" && (
            <div className="space-y-2 text-sm">
              <p>{report.note}</p>
              <p>
                Retrieved {report.counts.retrieved} · relevant/contextual{" "}
                {report.counts.relevant} · organizations{" "}
                {report.counts.organizations} · public routes{" "}
                {report.counts.routes} · Pakistan confirmed{" "}
                {report.counts.pakistanConfirmed} · eligibility unknown{" "}
                {report.counts.eligibilityUnknown} · duplicates excluded{" "}
                {report.counts.duplicates} · worth reviewing{" "}
                {report.counts.worthReviewing} · explicit demand{" "}
                {report.counts.explicitDemand ?? "not recorded"}.{" "}
                {report.cached
                  ? "Cached source snapshot."
                  : "Source retrieved this run."}
              </p>
              <p>
                Worldwide is not confirmed Pakistan eligibility. Relevance is a
                skill/topic match, not proof that Hassan meets experience,
                authorization or employer requirements.
              </p>
            </div>
          )}
          <div className="panel space-y-3 p-4">
            <Filters value={filters} onChange={setFilters} />
            {active === "discover" && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  className="w-auto"
                  type="checkbox"
                  checked={reviewableOnly}
                  onChange={(e) => setReviewableOnly(e.target.checked)}
                />
                Worth-reviewing candidates only (uncheck to inspect irrelevant,
                restricted, stale and informational results)
              </label>
            )}
          </div>
          {message && (
            <p role="status" className="text-sm text-zinc-700">
              {message}
            </p>
          )}
          <p className="text-sm">
            {candidates.length} matching source snapshots.{" "}
            {candidates.length > 40
              ? "Showing the first 40; narrow filters."
              : ""}
          </p>
          {!candidates.length && (
            <p className="panel p-5 text-sm">
              No matching actionable findings in this view. A successful source
              request is not commercial success. Review source limitations or
              adjust filters; no opportunities were invented.
            </p>
          )}
          {candidates.slice(0, 40).map((f) => {
            const key = `${f.provider}:${f.sourceId}`;
            const stored = records.find(
              (r) =>
                r.data.provider === f.provider &&
                r.data.sourceId === f.sourceId,
            );
            const result = saved[key];
            return (
              <FindingCard key={key} f={f}>
                {active === "discover" && f.saveable && !result && (
                  <>
                    <select
                      aria-label={`Save pipeline for ${f.title}`}
                      className="max-w-xs"
                      value={
                        f.pipeline === "job"
                          ? "job"
                          : selection[key] || f.pipeline
                      }
                      disabled={pending || f.pipeline === "job"}
                      onChange={(e) =>
                        setSelection({
                          ...selection,
                          [key]: e.target.value as (typeof pipelines)[number],
                        })
                      }
                    >
                      {(f.pipeline === "job"
                        ? (["job"] as const)
                        : (["client", "partnership", "research"] as const)
                      ).map((p) => (
                        <option key={p} value={p}>
                          {pipelineName[p]}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="outline"
                      disabled={pending}
                      onClick={() => {
                        start(async () => {
                          try {
                            const r = await saveAcquisitionAction(
                              report!.token,
                              f.provider,
                              f.sourceId,
                              selection[key] || f.pipeline,
                              query.campaignId,
                            );
                            if (r.error) {
                              setMessage(r.error);
                              return;
                            }
                            setSaved((s) => ({ ...s, [key]: r.saved! }));
                            setMessage(
                              r.saved!.existing
                                ? "Existing selected finding preserved; last seen updated."
                                : "Selected finding saved. No CRM client or application created automatically.",
                            );
                          } catch {
                            setMessage(
                              "Save failed. Existing records were preserved.",
                            );
                          }
                        });
                      }}
                    >
                      Save selected finding
                    </Button>
                  </>
                )}
                {result && (
                  <span>
                    Saved.{" "}
                    <Link
                      className="text-teal-800 underline"
                      href={`/acquisition?view=${result.pipeline === "job" ? "jobs" : result.pipeline === "client" ? "clients" : result.pipeline === "partnership" ? "partnerships" : "research"}`}
                    >
                      Open saved pipeline
                    </Link>
                  </span>
                )}
                {(result?.legacyOpportunityId ||
                  stored?.legacyOpportunityId) && (
                  <Link
                    className="text-teal-800 underline"
                    href={`/opportunities/${result?.legacyOpportunityId || stored?.legacyOpportunityId}`}
                  >
                    Open existing research / Qwen / CRM handoff
                  </Link>
                )}
                {stored && (
                  <p className="w-full text-xs text-zinc-500">
                    First seen {stored.firstSeen}; last selected/seen{" "}
                    {stored.lastSeen}; organization identity{" "}
                    {stored.entityId || "unresolved"}. Source aliases:{" "}
                    {stored.aliases
                      .map((a) => `${a.provider}:${a.sourceId}`)
                      .join(", ")}
                    .
                  </p>
                )}
              </FindingCard>
            );
          })}
        </div>
      )}
    </>
  );
}
