"use client";
import { useState, useTransition } from "react";
import type { OutreachDraft } from "@/db/schema";
import { saveDraft } from "@/features/outreach/actions";
import { Button } from "@/components/ui/button";
import { generateLeadSuggestions } from "@/features/ai/actions";
import type { Suggestions } from "@/features/ai/grounding";

export function OutreachWorkspace({
  leadId,
  initialDrafts,
  ai,
}: {
  leadId: string;
  initialDrafts: OutreachDraft[];
  ai: { enabled: boolean; reason: string };
}) {
  const [drafts, setDrafts] = useState(initialDrafts);
  const [id, setId] = useState<string | null>(null);
  const [channel, setChannel] = useState<"email" | "linkedin">("email");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  function generate(draft: boolean) {
    setMessage("");
    start(async () => {
      try {
        const result = await generateLeadSuggestions(leadId);
        if (result.error) {
          setMessage(result.error);
          return;
        }
        const next = result.suggestions!;
        setSuggestions(next);
        if (draft) {
          setId(null);
          setChannel("email");
          setSubject(next.email.subject);
          setBody(next.email.body);
        }
        setMessage(
          draft
            ? "Generated an unsaved draft. Review the evidence and edit before saving or copying."
            : "Analysis prepared from saved data. No website was fetched and no score was changed.",
        );
      } catch {
        setMessage(
          "Unable to reach the app. Existing drafts remain available; retry when connected.",
        );
      }
    });
  }
  function selectDraft(draft?: OutreachDraft) {
    setId(draft?.id ?? null);
    setChannel(draft?.channel ?? "email");
    setSubject(draft?.subject ?? "");
    setBody(draft?.body ?? "");
    setMessage("");
  }
  function save() {
    setMessage("");
    start(async () => {
      try {
        const result = await saveDraft({ id, leadId, channel, subject, body });
        if (result.error) {
          setMessage(result.error);
          return;
        }
        const draft = result.draft!;
        setId(draft.id);
        setDrafts((previous) => [
          draft,
          ...previous.filter((d) => d.id !== draft.id),
        ]);
        setMessage("Draft saved. Nothing was sent.");
      } catch {
        setMessage("Could not save. Check your connection, then retry.");
      }
    });
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        channel === "email" ? `Subject: ${subject}\n\n${body}` : body,
      );
      setMessage("Copied. Review and send manually in your messaging app.");
    } catch {
      setMessage("Clipboard unavailable. Select and copy the text manually.");
    }
  }
  return (
    <section
      className="panel mt-8 max-w-3xl space-y-5 p-6"
      aria-labelledby="outreach-title"
    >
      <h2 id="outreach-title" className="text-lg font-semibold">
        Outreach assistant
      </h2>
      <p className="text-sm text-zinc-600">
        Drafts only. Review every claim and source, edit the message, and send
        manually. This app never sends messages.
      </p>
      <p className="text-xs text-zinc-500">
        {ai.reason} Save lead changes before analyzing. AI suggestions never
        change evidence-completeness scores.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() => generate(false)}
          disabled={pending || !ai.enabled}
        >
          {pending ? "Working…" : "Analyze lead"}
        </Button>
        <Button
          variant="outline"
          onClick={() => generate(true)}
          disabled={pending || !ai.enabled}
        >
          Draft outreach
        </Button>
      </div>
      {suggestions && (
        <div className="space-y-3 rounded-md border border-zinc-200 p-4 text-sm">
          <h3 className="font-semibold">
            Suggested analysis · Human review required
          </h3>
          <p>
            <strong>Potential service fit:</strong>{" "}
            {suggestions.analysis.potentialServiceFit}
          </p>
          <p>
            <strong>Recorded problem:</strong>{" "}
            {suggestions.analysis.businessProblem}
          </p>
          {suggestions.analysis.evidenceQuote && (
            <p>
              <strong>
                Selected evidence ({suggestions.analysis.evidenceField}):
              </strong>{" "}
              “{suggestions.analysis.evidenceQuote}”
            </p>
          )}
          {suggestions.analysis.sourceUrl && (
            <a
              className="block break-all text-teal-800 underline"
              href={suggestions.analysis.sourceUrl}
              target="_blank"
              rel="noreferrer noopener"
            >
              Supplied source (not independently verified):{" "}
              {suggestions.analysis.sourceUrl}
            </a>
          )}
          <div>
            <strong>Missing information:</strong>
            {suggestions.analysis.missingInformation.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {suggestions.analysis.missingInformation.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            ) : (
              <p>
                Check that all operator-recorded evidence is current; this tool
                does not verify buying intent.
              </p>
            )}
          </div>
          <p>
            <strong>Outreach angle:</strong>{" "}
            {suggestions.analysis.outreachAngle}
          </p>
          <p>
            <strong>Next human action:</strong>{" "}
            {suggestions.analysis.nextHumanAction}
          </p>
          {suggestions.caseStudyUrl ? (
            <p>
              Configured case study — confirm relevance:{" "}
              <a
                className="break-all text-teal-800 underline"
                href={suggestions.caseStudyUrl}
                target="_blank"
                rel="noreferrer noopener"
              >
                {suggestions.caseStudyUrl}
              </a>
            </p>
          ) : (
            <p>
              No verified case study configured. The draft links only to
              Hassan’s general portfolio.
            </p>
          )}
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => {
              setId(null);
              setChannel("linkedin");
              setSubject("");
              setBody(suggestions.linkedin.body);
              setMessage("Loaded an unsaved LinkedIn draft for manual review.");
            }}
          >
            Use short LinkedIn draft
          </Button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          onClick={() => selectDraft()}
          disabled={pending}
        >
          New manual draft
        </Button>
        <label htmlFor="saved-draft" className="sr-only">
          Saved draft
        </label>
        <select
          id="saved-draft"
          className="min-w-0 flex-1"
          value={id ?? ""}
          disabled={pending}
          onChange={(e) =>
            selectDraft(drafts.find((d) => d.id === e.target.value))
          }
        >
          <option value="">Unsaved draft</option>
          {drafts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.channel}: {d.subject || d.body.slice(0, 50)}
            </option>
          ))}
        </select>
      </div>
      <fieldset disabled={pending} className="space-y-4">
        <div>
          <label htmlFor="draft-channel">Channel</label>
          <select
            id="draft-channel"
            value={channel}
            onChange={(e) => {
              setChannel(e.target.value as "email" | "linkedin");
              setMessage("");
            }}
          >
            <option value="email">Email</option>
            <option value="linkedin">LinkedIn</option>
          </select>
        </div>
        {channel === "email" && (
          <div>
            <label htmlFor="draft-subject">Subject</label>
            <input
              id="draft-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
            />
          </div>
        )}
        <div>
          <label htmlFor="draft-body">Message body</label>
          <textarea
            id="draft-body"
            rows={10}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={10000}
          />
          <p className="mt-1 text-xs text-zinc-500">
            {body.trim() ? body.trim().split(/\s+/).length : 0} words · Email
            target: 60–110 words
          </p>
        </div>
      </fieldset>
      <div className="flex gap-3">
        <Button onClick={save} disabled={pending || !body.trim()}>
          {pending ? "Saving…" : id ? "Save changes to draft" : "Save draft"}
        </Button>
        <Button
          variant="outline"
          onClick={copy}
          disabled={pending || !body.trim()}
        >
          Copy draft
        </Button>
      </div>
      {message && (
        <p role="status" className="text-sm text-zinc-600">
          {message}
        </p>
      )}
    </section>
  );
}
