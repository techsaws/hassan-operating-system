"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createCampaign,
  writeOpportunity,
  retrieveOpportunity,
  linkOpportunityLead,
} from "./mutations";
import { getOpportunity } from "./queries";
import { analyzeOpportunity } from "./analysis";
import { ResearchError } from "./retrieval";

export async function saveOpportunityAction(id: string | null, input: unknown) {
  try {
    const saved = await writeOpportunity(id, input);
    revalidatePath("/opportunities");
    return { opportunity: saved };
  } catch (e) {
    if (e instanceof z.ZodError)
      return {
        error: e.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join(" "),
      };
    const error = e as { code?: string; cause?: { code?: string } };
    if (error.code === "23505" || error.cause?.code === "23505")
      return {
        error:
          "An opportunity with this source URL already exists. Open it from the worklist instead.",
      };
    return {
      error:
        "Could not save opportunity. Check the database and campaign, then retry.",
    };
  }
}
export async function campaignAction(name: string) {
  try {
    await createCampaign(name);
    revalidatePath("/opportunities");
    return { ok: true };
  } catch {
    return {
      error:
        "Enter a campaign name under 200 characters and check the database.",
    };
  }
}
export async function retrieveOpportunityAction(id: string, consent: boolean) {
  try {
    const saved = await retrieveOpportunity(id, consent);
    revalidatePath("/opportunities");
    return { opportunity: saved };
  } catch (e) {
    return {
      error:
        e instanceof ResearchError
          ? e.message
          : "Could not retrieve. Confirm permission, save a public source URL, and check your connection. Manual research remains available.",
    };
  }
}
export async function analyzeOpportunityAction(
  id: string,
  origin: "retrieved" | "operator",
) {
  if (
    !z.uuid().safeParse(id).success ||
    !["retrieved", "operator"].includes(origin)
  )
    return { error: "Invalid opportunity or evidence origin." };
  try {
    const o = await getOpportunity(id);
    if (!o) return { error: "Opportunity not found." };
    return { analysis: await analyzeOpportunity(o, origin) };
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    return {
      error: /^(Local |The local model|Record evidence|No successfully)/.test(
        message,
      )
        ? message
        : "Analysis unavailable. Continue manual research; no data was changed.",
    };
  }
}
export async function prepareOpportunityAction(id: string) {
  let linked;
  try {
    linked = await linkOpportunityLead(id);
  } catch {
    return {
      error:
        "Record a company name and check the database before creating or linking a lead.",
    };
  }
  revalidatePath("/leads");
  revalidatePath("/");
  revalidatePath("/opportunities");
  redirect(`/leads/${linked.leadId}/edit#outreach-title`);
}
