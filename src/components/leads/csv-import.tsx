"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { inspectCsv, previewOrImport } from "@/features/leads/import-actions";
import {
  importFields,
  MAX_CSV_BYTES,
  type ColumnMapping,
  type ImportReport,
} from "@/features/leads/import-fields";
import { Button } from "@/components/ui/button";

export function CsvImport() {
  const [text, setText] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  function loadFile(file?: File) {
    setReport(null);
    setMapping(null);
    setHeaders([]);
    setText("");
    setError("");
    setDone(false);
    if (!file) return;
    if (file.size > MAX_CSV_BYTES) {
      setError("CSV must be 1 MiB or smaller.");
      return;
    }
    start(async () => {
      try {
        const csv = await file.text();
        const result = await inspectCsv(csv);
        if (result.error) {
          setError(result.error);
          return;
        }
        setText(csv);
        setHeaders(result.headers!);
        setMapping(result.mapping!);
      } catch {
        setError("Unable to read file. Try again.");
      }
    });
  }
  function process(commit: boolean) {
    if (!mapping) return;
    setError("");
    start(async () => {
      try {
        const result = await previewOrImport(text, mapping, commit);
        if (result.error) {
          setError(result.error);
          return;
        }
        setReport(result.report!);
        setDone(commit);
      } catch {
        setError("Request failed. Check your connection.");
      }
    });
  }
  return (
    <div className="panel max-w-4xl space-y-6 p-6">
      <p className="text-sm text-zinc-600">
        Upload a UTF-8 CSV, map columns, then review before importing. Maximum 1
        MiB / 1,000 data rows. Existing leads are never overwritten. Blank
        emails are allowed and cannot be deduplicated.
      </p>
      <label htmlFor="csv-file">CSV file</label>
      <input
        id="csv-file"
        type="file"
        accept=".csv,text/csv"
        disabled={pending}
        onChange={(e) => loadFile(e.target.files?.[0])}
      />
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {mapping && (
        <fieldset
          disabled={pending || done}
          className="grid gap-4 sm:grid-cols-2"
        >
          <legend className="mb-4 font-semibold">Column mapping</legend>
          {importFields.map(([key, label]) => (
            <div key={key}>
              <label htmlFor={`map-${key}`}>
                {label}
                {key === "companyName" ? " *" : ""}
              </label>
              <select
                id={`map-${key}`}
                value={mapping[key]}
                onChange={(e) => {
                  setMapping({ ...mapping, [key]: Number(e.target.value) });
                  setReport(null);
                }}
              >
                <option value={-1}>Ignore / not supplied</option>
                {headers.map((h, i) => (
                  <option key={i} value={i}>
                    {i + 1}. {h || "(empty header)"}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </fieldset>
      )}
      {mapping && !done && (
        <Button onClick={() => process(false)} disabled={pending}>
          {pending ? "Processing…" : "Preview import"}
        </Button>
      )}
      {report && (
        <section
          aria-live="polite"
          className="space-y-4 border-t border-zinc-200 pt-5"
        >
          <h2 className="text-lg font-semibold">
            {done ? "Import complete" : "Import preview"}
          </h2>
          <p className="text-sm">
            Total: {report.total} ·{" "}
            {done ? `Imported: ${report.imported}` : `Ready: ${report.valid}`} ·
            Skipped duplicates: {report.skipped} · Invalid: {report.invalid}
          </p>
          {!done && report.examples.length > 0 && (
            <div className="overflow-auto">
              <table className="w-full text-left text-sm">
                <caption className="mb-2 text-left text-xs text-zinc-500">
                  First {report.examples.length} valid records · Long values
                  truncated for display
                </caption>
                <thead>
                  <tr>
                    {importFields.map(([key, label]) => (
                      <th key={key}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.examples.map((r, i) => (
                    <tr key={i}>
                      {importFields.map(([key]) => (
                        <td key={key} className="max-w-64">
                          <span
                            className="block truncate"
                            title={r[key] ?? undefined}
                          >
                            {r[key] || "—"}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {report.issues.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium">
                Row issues (first 50; row numbers exclude blank lines)
              </h3>
              <ul className="max-h-64 space-y-1 overflow-auto text-xs text-zinc-600">
                {report.issues.map((issue, i) => (
                  <li key={i}>
                    {issue.row ? `Row ${issue.row}: ` : ""}
                    {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!done ? (
            <Button
              onClick={() => process(true)}
              disabled={pending || !report.valid}
            >
              {pending ? "Importing…" : `Import ${report.valid} valid leads`}
            </Button>
          ) : (
            <Button asChild>
              <Link href="/leads">View leads</Link>
            </Button>
          )}
        </section>
      )}
    </div>
  );
}
