import "server-only";
import { parse } from "csv-parse/sync";
import { z } from "zod";
import { leadInput } from "./validation";
import {
  importFields,
  MAX_CSV_BYTES,
  MAX_CSV_ROWS,
  type ColumnMapping,
} from "./import-fields";

export function parseCsv(text: string) {
  if (Buffer.byteLength(text, "utf8") > MAX_CSV_BYTES)
    throw new Error("CSV must be 1 MiB or smaller.");
  let records: string[][];
  try {
    records = parse(text, {
      bom: true,
      skip_empty_lines: true,
      relax_column_count: true,
      max_record_size: 32768,
      to: MAX_CSV_ROWS + 2,
    });
  } catch {
    throw new Error(
      "Malformed CSV. Check quotes and field lengths (maximum record: 32 KiB).",
    );
  }
  if (records.length < 2)
    throw new Error("CSV needs a header and at least one data row.");
  if (records.length - 1 > MAX_CSV_ROWS)
    throw new Error(`CSV may contain at most ${MAX_CSV_ROWS} data rows.`);
  const [headers, ...rows] = records;
  if (headers.length > 50 || headers.some((h) => h.length > 200))
    throw new Error(
      "Use at most 50 columns with headers under 200 characters.",
    );
  return { headers, rows };
}
export function suggestMapping(headers: string[]): ColumnMapping {
  return Object.fromEntries(
    importFields.map(([key, , aliases]) => [
      key,
      headers.findIndex((h) =>
        (aliases as readonly string[]).includes(
          h
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]/g, ""),
        ),
      ),
    ]),
  ) as ColumnMapping;
}
export function prepareCsv(text: string, inputMapping: unknown) {
  const { headers, rows } = parseCsv(text);
  const mapping = z
    .object(
      Object.fromEntries(
        importFields.map(([key]) => [
          key,
          z
            .number()
            .int()
            .min(-1)
            .max(headers.length - 1),
        ]),
      ),
    )
    .parse(inputMapping) as ColumnMapping;
  if (mapping.companyName < 0)
    throw new Error("Map a company name column before previewing.");
  const selected = Object.values(mapping).filter((i) => i >= 0);
  if (new Set(selected).size !== selected.length)
    throw new Error("Map each CSV column to only one field.");
  const candidates: { row: number; data: z.output<typeof leadInput> }[] = [];
  const issues: { row: number; message: string }[] = [];
  const seen = new Set<string>();
  let invalid = 0,
    duplicates = 0;
  rows.forEach((cells, index) => {
    const row = index + 2;
    if (cells.length !== headers.length) {
      invalid++;
      issues.push({ row, message: "Column count does not match the header." });
      return;
    }
    const raw = Object.fromEntries(
      importFields.map(([key]) => [
        key,
        mapping[key] < 0 ? "" : cells[mapping[key]].trim(),
      ]),
    );
    raw.serviceInterest = raw.serviceInterest.toLowerCase();
    const parsed = leadInput.safeParse({
      ...raw,
      status: "new",
      nextFollowUp: "",
    });
    if (!parsed.success) {
      invalid++;
      issues.push({
        row,
        message: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      });
      return;
    }
    const email = parsed.data.contactEmail;
    if (email && seen.has(email)) {
      duplicates++;
      issues.push({ row, message: "Duplicate email within CSV." });
      return;
    }
    if (email) seen.add(email);
    candidates.push({ row, data: parsed.data });
  });
  return { total: rows.length, candidates, issues, invalid, duplicates };
}
