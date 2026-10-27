"use server";
import { revalidatePath } from "next/cache";
import { parseCsv, suggestMapping } from "./csv";
import { processImport } from "./import-service";
import type { ColumnMapping } from "./import-fields";

export async function inspectCsv(text: string) {
  try {
    const { headers } = parseCsv(text);
    return { headers, mapping: suggestMapping(headers) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unable to read CSV." };
  }
}
export async function previewOrImport(
  text: string,
  mapping: ColumnMapping,
  commit: boolean,
) {
  try {
    const report = await processImport(text, mapping, commit);
    if (commit) {
      revalidatePath("/");
      revalidatePath("/leads");
    }
    return { report };
  } catch {
    return {
      error:
        "Unable to process CSV. Check mapping, file limits, and database connection. Nothing was partially imported.",
    };
  }
}
