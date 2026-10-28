"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import type { Opportunity } from "@/db/schema";
import { Button } from "@/components/ui/button";
import {
  blankAnnotation,
  contactStatus,
  type Annotation,
} from "@/features/opportunities/contact-types";
import {
  contactSourceAction,
  contactAnnotationAction,
  researchedApproachAction,
  saveResearchedDraftAction,
} from "@/features/opportunities/contact-actions";
import type { prepareResearchedApproach } from "@/features/opportunities/approach";
export function ContactResearchPanel({
  opportunity,
}: {
  opportunity: Opportunity;
}) {
  const [record, setRecord] = useState(opportunity);
  const [url, setUrl] = useState(opportunity.sourceUrl || "");
  const [consent, setConsent] = useState(false);
  const [manual, setManual] = useState("");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState(
    opportunity.contactResearch?.sources[0]?.id || "",
  );
  const [annotation, updateAnnotation] = useState<Annotation>(
    opportunity.contactResearch?.sources[0]?.annotation || {
      ...blankAnnotation,
    },
  );
  const [approach, setApproach] = useState<Awaited<
    ReturnType<typeof prepareResearchedApproach>
  > | null>(null);
  const [subject, setSubject] = useState(""),
    [body, setBody] = useState("");
  const [approved, setApproved] = useState(false),
    [leadId, setLeadId] = useState("");
  const [pending, start] = useTransition();
  const source = record.contactResearch?.sources.find((s) => s.id === selected);
  function setAnnotation(value: Annotation) {
    updateAnnotation(value);
    setApproach(null);
    setApproved(false);
  }
  function accepted(o: Opportunity) {
    setRecord(o);
    setApproach(null);
    setApproved(false);
  }
  async function addSource(manualMode: boolean) {
    setMessage("");
    try {
      const r = await contactSourceAction(
        record.id,
        url,
        consent,
        manualMode ? manual : null,
      );
      if ("error" in r) {
        setMessage(r.error);
        return;
      }
      const o = r.opportunity!;
      accepted(o);
      const s = o.contactResearch!.sources.at(-1)!;
      setSelected(s.id);
      setAnnotation(s.annotation);
      setManual("");
      setMessage(
        "Source recorded separately. Review the excerpt and annotate published facts.",
      );
    } catch {
      setMessage("Source unavailable. Manual research remains available.");
    }
  }
  return (
    <section
      className="panel mt-6 max-w-3xl space-y-4 p-6"
      aria-labelledby="contact-research-title"
    >
      <h2 id="contact-research-title" className="text-lg font-semibold">
        Research contact and workflow
      </h2>
      <p className="text-sm font-medium">
        {contactStatus(record.contactResearch)}
      </p>
      <p className="text-sm text-zinc-600">
        Use official company contact/about/team pages. Retrieve one permitted
        public page at a time; no crawl or email guessing. Published customer
        booking forms are not approved sales channels. New snapshots preserve
        existing discovery and operator evidence.
      </p>
      <label htmlFor="contact-source-url">
        Official / permitted source URL
      </label>
      <input
        id="contact-source-url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        maxLength={2048}
      />
      <label className="flex items-start gap-2 text-sm">
        <input
          className="w-auto"
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        I checked that this public page permits this request and excerpt
        storage.
      </label>
      <Button
        variant="outline"
        disabled={pending || !consent || !url}
        onClick={() => start(() => addSource(false))}
      >
        {pending ? "Working…" : "Research contact"}
      </Button>
      <details>
        <summary className="cursor-pointer text-sm text-teal-800">
          Manual path for blocked/unsupported pages
        </summary>
        <p className="my-2 text-xs">
          Review the page manually where permitted and paste a concise public
          excerpt with the original URL. This remains operator-recorded, not
          server-verified.
        </p>
        <label htmlFor="manual-contact-excerpt">
          Operator-recorded public excerpt
        </label>
        <textarea
          id="manual-contact-excerpt"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          maxLength={4000}
        />
        <Button
          variant="outline"
          disabled={pending || !url || manual.trim().length < 20}
          onClick={() => start(() => addSource(true))}
        >
          Record manual source
        </Button>
      </details>
      {record.contactResearch?.sources.length ? (
        <>
          <label htmlFor="research-source-select">Saved source snapshot</label>
          <select
            id="research-source-select"
            value={selected}
            onChange={(e) => {
              const s = record.contactResearch!.sources.find(
                (s) => s.id === e.target.value,
              )!;
              setSelected(s.id);
              setAnnotation(s.annotation);
              setApproach(null);
            }}
          >
            {record.contactResearch.sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.origin === "retrieved"
                  ? "Server retrieved"
                  : "Operator-recorded"}{" "}
                · {s.url}
              </option>
            ))}
          </select>
          {source && (
            <>
              <p className="text-xs break-all">
                {source.origin === "retrieved"
                  ? "Actually retrieved through source safeguards"
                  : "Operator-recorded; not server-verified"}{" "}
                · {source.recordedAt} ·{" "}
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Original source
                </a>
                . Retrieval verifies access only, not claims or delivery.
              </p>
              <blockquote className="max-h-64 overflow-auto whitespace-pre-wrap border-l-2 pl-3 text-sm">
                {source.excerpt}
              </blockquote>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  start(async () => {
                    try {
                      const r = await contactAnnotationAction(
                        record.id,
                        source.id,
                        annotation,
                      );
                      if ("error" in r) {
                        setMessage(r.error);
                        return;
                      }
                      accepted(r.opportunity!);
                      setMessage(
                        "Reviewed annotations saved. Existing CRM fields and drafts were not changed.",
                      );
                    } catch {
                      setMessage("Could not save annotations.");
                    }
                  });
                }}
              >
                <fieldset disabled={pending} className="space-y-3">
                  <h3 className="font-semibold">Published contact facts</h3>
                  {(
                    [
                      ["name", "Contact name (only if published)"],
                      ["role", "Role / association (operator interpretation)"],
                      ["roleQuote", "Verbatim name / role evidence"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key}>
                      <label htmlFor={`contact-${key}`}>{label}</label>
                      <input
                        id={`contact-${key}`}
                        value={annotation[key]}
                        maxLength={key === "roleQuote" ? 500 : 200}
                        onChange={(e) =>
                          setAnnotation({
                            ...annotation,
                            [key]: e.target.value,
                            reviewed: false,
                          })
                        }
                      />
                    </div>
                  ))}
                  <label htmlFor="contact-route-kind">
                    Published route type
                  </label>
                  <select
                    id="contact-route-kind"
                    value={annotation.routeKind}
                    onChange={(e) =>
                      setAnnotation({
                        ...annotation,
                        routeKind: e.target.value as Annotation["routeKind"],
                        reviewed: false,
                      })
                    }
                  >
                    <option value="none">No route established</option>
                    <option value="email">Published business email</option>
                    <option value="phone">Published business phone</option>
                    <option value="public_page">
                      Public business contact page
                    </option>
                    <option value="customer_booking">
                      Customer booking form — excluded
                    </option>
                  </select>
                  <label htmlFor="contact-route">
                    Published route value (no guessed addresses)
                  </label>
                  <input
                    id="contact-route"
                    value={annotation.route}
                    maxLength={2048}
                    onChange={(e) =>
                      setAnnotation({
                        ...annotation,
                        route: e.target.value,
                        reviewed: false,
                      })
                    }
                  />
                  <label htmlFor="route-purpose">
                    Purpose supported by the source
                  </label>
                  <select
                    id="route-purpose"
                    value={annotation.routePurpose}
                    onChange={(e) =>
                      setAnnotation({
                        ...annotation,
                        routePurpose: e.target
                          .value as Annotation["routePurpose"],
                        reviewed: false,
                      })
                    }
                  >
                    <option value="unknown">
                      Unknown / permission to approach not established
                    </option>
                    <option value="customer_only">
                      Customer service only — excluded
                    </option>
                    <option value="business_inquiries">
                      General business inquiries explicitly supported
                    </option>
                    <option value="b2b_explicit">
                      B2B / vendor inquiries explicitly supported
                    </option>
                  </select>
                  <label htmlFor="route-quote">
                    Verbatim route and purpose evidence
                  </label>
                  <textarea
                    id="route-quote"
                    value={annotation.routeQuote}
                    maxLength={500}
                    onChange={(e) =>
                      setAnnotation({
                        ...annotation,
                        routeQuote: e.target.value,
                        reviewed: false,
                      })
                    }
                  />
                  <h3 className="font-semibold">
                    Workflow facts and uncertainties
                  </h3>
                  <label htmlFor="workflow-quote">
                    Observed workflow — verbatim source quote
                  </label>
                  <textarea
                    id="workflow-quote"
                    value={annotation.workflowQuote}
                    maxLength={500}
                    onChange={(e) =>
                      setAnnotation({
                        ...annotation,
                        workflowQuote: e.target.value,
                        reviewed: false,
                      })
                    }
                  />
                  <label htmlFor="automation-question">
                    Possible automation question — inference, not a fact
                  </label>
                  <textarea
                    id="automation-question"
                    value={annotation.automationQuestion}
                    maxLength={500}
                    onChange={(e) =>
                      setAnnotation({
                        ...annotation,
                        automationQuestion: e.target.value,
                        reviewed: false,
                      })
                    }
                  />
                  <label htmlFor="problem-quote">
                    Actual operational problem — verbatim evidence (otherwise
                    blank)
                  </label>
                  <textarea
                    id="problem-quote"
                    value={annotation.problemQuote}
                    maxLength={500}
                    onChange={(e) =>
                      setAnnotation({
                        ...annotation,
                        problemQuote: e.target.value,
                        reviewed: false,
                      })
                    }
                  />
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      className="w-auto"
                      type="checkbox"
                      checked={annotation.problemConfirmed}
                      onChange={(e) =>
                        setAnnotation({
                          ...annotation,
                          problemConfirmed: e.target.checked,
                          reviewed: false,
                        })
                      }
                    />
                    I reviewed the problem evidence in context. It describes a
                    business workflow problem, not a customer HVAC problem or a
                    missing feature. This is my assessment.
                  </label>
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      className="w-auto"
                      type="checkbox"
                      checked={annotation.reviewed}
                      onChange={(e) =>
                        setAnnotation({
                          ...annotation,
                          reviewed: e.target.checked,
                        })
                      }
                    />
                    I reviewed these facts and route purpose against this
                    source. Publication does not prove consent or delivery.
                  </label>
                  <Button>Save contact / workflow research</Button>
                </fieldset>
              </form>
            </>
          )}
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setMessage("");
                try {
                  const r = await researchedApproachAction(record.id);
                  if ("error" in r) {
                    setMessage(r.error);
                    return;
                  }
                  setApproach(r.approach!);
                  setSubject(r.approach!.subject);
                  setBody(r.approach!.body);
                  setApproved(false);
                } catch {
                  setMessage(
                    "Local AI unavailable. Saved research is preserved; existing manual draft editing remains available.",
                  );
                }
              })
            }
          >
            Prepare researched approach with Qwen
          </Button>
          <p className="text-xs text-zinc-500">
            Uses saved reviewed research only. Save annotation edits before
            preparing an approach.
          </p>
        </>
      ) : (
        <p className="text-sm text-zinc-500">
          No contact research sources recorded. Start with the official site and
          follow its public contact/about links manually.
        </p>
      )}
      {approach && (
        <div className="space-y-3 rounded border p-4 text-sm">
          <h3 className="font-semibold">
            Internal approach — human review required
          </h3>
          <p>{approach.summary}</p>
          <p>{approach.status}</p>
          <p>
            Appropriate route:{" "}
            {approach.route
              ? `${approach.route.value} (${approach.route.kind}; operator reviewed; ${approach.route.source})`
              : "Not established. Contact research needed; do not send this message."}
          </p>
          <p>{approach.angle}</p>
          <p>{approach.uncertainty}</p>
          <label htmlFor="researched-subject">Editable subject</label>
          <input
            id="researched-subject"
            value={subject}
            maxLength={200}
            onChange={(e) => {
              setSubject(e.target.value);
              setApproved(false);
            }}
          />
          <label htmlFor="researched-body">Short editable message</label>
          <textarea
            id="researched-body"
            rows={8}
            value={body}
            maxLength={10000}
            onChange={(e) => {
              setBody(e.target.value);
              setApproved(false);
            }}
          />
          <label className="flex items-start gap-2">
            <input
              className="w-auto"
              type="checkbox"
              checked={approved}
              onChange={(e) => setApproved(e.target.checked)}
            />
            I reviewed the message, source facts and appropriate business email
            route. Save only; never send.
          </label>
          <Button
            disabled={pending || !approved || !approach.canSaveEmail}
            onClick={() =>
              start(async () => {
                try {
                  const r = await saveResearchedDraftAction(
                    record.id,
                    subject,
                    body,
                    approved,
                  );
                  if ("error" in r) {
                    setMessage(r.error);
                    return;
                  }
                  setLeadId(r.leadId!);
                  setMessage(
                    "Saved in existing CRM email drafts. Nothing was sent.",
                  );
                } catch {
                  setMessage("Draft could not be saved.");
                }
              })
            }
          >
            Save reviewed message to CRM drafts
          </Button>
          {!approach.canSaveEmail && (
            <p>
              No reviewed business email route. Keep this internal; existing
              email/LinkedIn drafts do not represent permission to contact a
              customer-service phone or booking form.
            </p>
          )}
          {leadId && (
            <Link
              className="text-teal-800 underline"
              href={`/leads/${leadId}/edit#outreach-title`}
            >
              Open saved CRM draft
            </Link>
          )}
        </div>
      )}
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
