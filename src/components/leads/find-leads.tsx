"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { services } from "@/features/leads/constants";
import type {
  DiscoveryInput,
  DiscoveryReport,
  Classification,
} from "@/features/discovery/types";
import { manualSearches } from "@/features/discovery/manual-search";
import {
  findLeadsAction,
  saveFindingAction,
} from "@/features/discovery/actions";
const labels: Record<Classification, string> = {
  explicit_request: "Explicit buyer request — unverified budget",
  uncertain_opportunity: "Relevant but uncertain",
  informational: "Informational discussion / reply",
  irrelevant: "Irrelevant / seller advertisement",
};
export function FindLeads({
  campaigns,
}: {
  campaigns: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState<DiscoveryInput>({
    campaignId:
      campaigns.find((c) => c.name === "US Small Business — AI Automation")
        ?.id ??
      campaigns[0]?.id ??
      "",
    targetService: "automation",
    country: "United States",
    buyerCategory: "small_business",
    keywords: "",
    includeUnknown: true,
  });
  const [report, setReport] = useState<DiscoveryReport | null>(null);
  const [usedInput, setUsedInput] = useState(input);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [excluded, setExcluded] = useState(false);
  const [saved, setSaved] = useState<Record<string, string>>({});
  return (
    <section
      className="panel mb-5 space-y-4 p-5"
      aria-labelledby="find-leads-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="find-leads-title" className="font-semibold">
            Discover buyer requests
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            No company, contact, or website required. Public API only.
          </p>
        </div>
        <Button onClick={() => setOpen(!open)}>
          {open ? "Close discovery" : "Find Leads"}
        </Button>
      </div>
      {open && (
        <>
          <p className="text-sm text-zinc-600">
            Source: HN’s dedicated freelance-request threads via its public
            Algolia API. Low volume; not a verified US small-business directory.
            At most three recent threads / 600 comments per run. Unknown country
            and size are never assumed.
          </p>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              start(async () => {
                try {
                  const result = await findLeadsAction(input);
                  if (result.error) {
                    setError(result.error);
                    return;
                  }
                  setReport(result.report!);
                  setUsedInput({ ...input });
                  setSaved({});
                } catch {
                  setError(
                    "Request failed. Use manual search; no data was saved.",
                  );
                }
              });
            }}
          >
            <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="discovery-campaign">Campaign</label>
                <select
                  id="discovery-campaign"
                  value={input.campaignId}
                  onChange={(e) =>
                    setInput({ ...input, campaignId: e.target.value })
                  }
                  required
                >
                  <option value="">Select a campaign</option>
                  {campaigns.map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="discovery-service">Target service</label>
                <select
                  id="discovery-service"
                  value={input.targetService}
                  onChange={(e) =>
                    setInput({
                      ...input,
                      targetService: e.target
                        .value as DiscoveryInput["targetService"],
                    })
                  }
                >
                  {services.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="discovery-country">
                  Buyer/company country (or Any)
                </label>
                <input
                  id="discovery-country"
                  value={input.country}
                  onChange={(e) =>
                    setInput({ ...input, country: e.target.value })
                  }
                  maxLength={80}
                  required
                />
              </div>
              <div>
                <label htmlFor="discovery-category">Buyer category</label>
                <select
                  id="discovery-category"
                  value={input.buyerCategory}
                  onChange={(e) =>
                    setInput({
                      ...input,
                      buyerCategory: e.target
                        .value as DiscoveryInput["buyerCategory"],
                    })
                  }
                >
                  <option value="small_business">Small business</option>
                  <option value="startup">Startup</option>
                  <option value="any">Any buyer</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="discovery-keywords">
                  Optional keywords (any match)
                </label>
                <input
                  id="discovery-keywords"
                  value={input.keywords}
                  onChange={(e) =>
                    setInput({ ...input, keywords: e.target.value })
                  }
                  maxLength={120}
                  placeholder="lead handling, scheduling, CRM"
                />
              </div>
              <label className="flex items-start gap-2 sm:col-span-2">
                <input
                  type="checkbox"
                  className="mt-1 w-auto"
                  checked={input.includeUnknown}
                  onChange={(e) =>
                    setInput({ ...input, includeUnknown: e.target.checked })
                  }
                />
                <span>
                  Include relevant requests with unknown country or size. These
                  are not confirmed campaign matches.
                </span>
              </label>
            </fieldset>
            <Button type="submit" disabled={pending || !input.campaignId}>
              {pending ? "Working…" : "Discover public opportunities"}
            </Button>
          </form>
          {!campaigns.length && (
            <p className="text-sm">Create a campaign below first.</p>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          {report && (
            <div className="space-y-4 border-t border-zinc-200 pt-4">
              <h3 className="font-semibold">Discovery review</h3>
              <p className="text-sm">{report.explanation}</p>
              <p className="text-xs text-zinc-500">
                Scanned {report.scanned} comments; source reported{" "}
                {report.upstreamComments}. Explicit requests:{" "}
                {report.classifications.explicit_request}; uncertain:{" "}
                {report.classifications.uncertain_opportunity}; informational:{" "}
                {report.classifications.informational}; irrelevant/sellers:{" "}
                {report.classifications.irrelevant}. Current matching
                candidates: {report.worthReviewing}; identifiable companies:{" "}
                {report.companies}; buyer-provided contact routes:{" "}
                {report.contactRoutes}.{" "}
                {report.partial
                  ? "Partial scan: request limit reached."
                  : "Scanned returned pages within the stated window."}
              </p>
              <p className="text-xs text-zinc-500">
                Last 90 days, up to three monthly threads. Requests older than
                45 days are stale. Recent publication does not prove
                availability. Contact links are verified present in source text
                only.
              </p>
              <div className="flex flex-wrap gap-3">
                {report.threads.map((t) => (
                  <a
                    key={t.id}
                    href={t.url}
                    className="text-xs text-teal-800 underline"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {t.title}
                  </a>
                ))}
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input
                  className="w-auto"
                  type="checkbox"
                  checked={excluded}
                  onChange={(e) => setExcluded(e.target.checked)}
                />
                Show excluded discussions and seller ads (not saveable)
              </label>
              {report.findings
                .filter(
                  (f) =>
                    excluded ||
                    ["explicit_request", "uncertain_opportunity"].includes(
                      f.classification,
                    ),
                )
                .slice(0, 40)
                .map((f) => (
                  <article
                    key={f.itemId}
                    className="space-y-2 rounded-md border border-zinc-200 p-4 text-sm"
                  >
                    <a
                      href={f.sourceUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="font-medium text-teal-800 underline"
                    >
                      {f.title}
                    </a>
                    <p>
                      {labels[f.classification]} ·{" "}
                      {f.availability === "current_unconfirmed"
                        ? "Recent; availability unconfirmed"
                        : f.availability.toUpperCase()}{" "}
                      · Published {f.publishedAt.slice(0, 10)}
                    </p>
                    <p>
                      Company: {f.companyName || "Not established"} · Service:{" "}
                      {f.service}
                    </p>
                    {f.excerpt && (
                      <blockquote className="whitespace-pre-wrap border-l-2 border-zinc-300 pl-3">
                        {f.excerpt}
                      </blockquote>
                    )}
                    <p>
                      Country evidence: {f.countryEvidence || "Unknown"} ·
                      Category evidence: {f.categoryEvidence || "Unknown"}
                    </p>
                    {f.contactRoute ? (
                      <p>
                        Buyer-provided contact route:{" "}
                        <a
                          className="break-all text-teal-800 underline"
                          href={f.contactRoute.url}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          {f.contactRoute.url}
                        </a>
                      </p>
                    ) : (
                      <p>
                        No explicit buyer-provided contact route established.
                      </p>
                    )}
                    <p className="text-xs text-zinc-500">
                      {f.reasons.join(" ")} Missing: {f.missing.join("; ")}.
                    </p>
                    {saved[f.itemId] ? (
                      <Link
                        className="text-teal-800 underline"
                        href={`/opportunities/${saved[f.itemId]}`}
                      >
                        Open saved opportunity
                      </Link>
                    ) : (
                      <Button
                        variant="outline"
                        disabled={pending || !f.saveable}
                        onClick={() =>
                          start(async () => {
                            try {
                              const result = await saveFindingAction(
                                f.itemId,
                                usedInput,
                              );
                              if (result.error) {
                                setError(result.error);
                                return;
                              }
                              setSaved((previous) => ({
                                ...previous,
                                [f.itemId]: result.saved!.id,
                              }));
                            } catch {
                              setError(
                                "Could not save. Existing worklist entries were not changed.",
                              );
                            }
                          })
                        }
                      >
                        Save opportunity
                      </Button>
                    )}
                  </article>
                ))}
              <p className="text-xs text-zinc-500">
                Up to 40 review rows. HN forbids generated/AI-edited posts and
                automated posting. Do not paste outreach drafts into HN
                comments; follow buyer application instructions and community
                rules. Saving rechecks the source and creates no CRM lead.
              </p>
            </div>
          )}
          <div className="space-y-2 border-t border-zinc-200 pt-4">
            <h3 className="font-medium">Search-assisted fallback</h3>
            <p className="text-xs text-zinc-500">
              Open these search links and research manually. HassanOS does not
              fetch search pages or treat snippets as verified evidence.
            </p>
            {manualSearches(input).map((link) => (
              <a
                key={link.label}
                className="block text-sm text-teal-800 underline"
                href={link.url}
                target="_blank"
                rel="noreferrer noopener"
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/opportunities/new"
              className="inline-block text-sm text-teal-800 underline"
            >
              Capture a manually found opportunity
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
