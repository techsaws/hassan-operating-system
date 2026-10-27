"use server";
import { z } from "zod";
import { getLead } from "@/features/leads/queries";
import { leadSnapshot, renderSuggestions } from "./grounding";
import { requestLocalPlan } from "./provider";
export async function generateLeadSuggestions(id: string) {
  if (!z.uuid().safeParse(id).success) return { error: "Invalid lead ID." };
  try {
    const lead = await getLead(id);
    if (!lead) return { error: "Lead no longer exists." };
    const snapshot = leadSnapshot(lead);
    const plan = await requestLocalPlan(snapshot);
    let caseStudy: string | null = null;
    if (process.env.OUTREACH_CASE_STUDY_URL) {
      const url = new URL(process.env.OUTREACH_CASE_STUDY_URL);
      if (
        !["https:", "http:"].includes(url.protocol) ||
        url.username ||
        url.password
      )
        return {
          error:
            "Invalid configured case-study URL. Use an explicitly curated http(s) URL without credentials.",
        };
      caseStudy = url.toString();
    }
    return { suggestions: renderSuggestions(plan, snapshot, caseStudy) };
  } catch (e) {
    // Only provider errors are safe to show; database errors may contain private query data.
    const message = e instanceof Error ? e.message : "";
    return {
      error: /^(Local |The local model)/.test(message)
        ? message
        : "Could not prepare suggestions. Check the database and local AI configuration. No draft was saved.",
    };
  }
}
