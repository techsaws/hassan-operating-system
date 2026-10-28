"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { discoverAcquisition, selectedFinding } from "./discovery";
import { pipelines, providerIds } from "./types";
import { persistFinding } from "./store";
import { saveBusiness } from "@/features/discovery/business-save";
import { saveDiscoveredOpportunity } from "@/features/discovery/save";
import { saveAgencyResearch } from "./agency-handoff";
export async function acquisitionDiscoveryAction(raw: unknown) {
  try {
    return { report: await discoverAcquisition(raw) };
  } catch (e) {
    const m = e instanceof Error ? e.message : "";
    return {
      error: /^(Wait|Remotive|HN |Source|No |Discovery|Business)/.test(m)
        ? m
        : "Discovery unavailable. Check source setup/network; no records fabricated or automatically saved.",
    };
  }
}
export async function saveAcquisitionAction(
  token: string,
  provider: string,
  sourceId: string,
  pipeline: string,
  campaignId: string,
) {
  try {
    z.uuid().parse(token);
    const p = z.enum(providerIds).parse(provider);
    const pipe = z.enum(pipelines).parse(pipeline);
    z.union([z.uuid(), z.literal("")]).parse(campaignId);
    const { finding, legacy } = selectedFinding(token, p, sourceId);
    if (finding.pipeline !== "job" && pipe === "job")
      throw new Error(
        "Business/research records cannot be reclassified as a job without hiring evidence.",
      );
    if (finding.pipeline === "job" && pipe !== "job")
      throw new Error(
        "Job postings must stay in the remote-job pipeline, never client sales.",
      );
    let legacyId: string | null = null;
    if (p === "agencies" && finding.saveable)
      legacyId = await saveAgencyResearch(finding, campaignId);
    if (finding.pipeline !== "job" && campaignId && finding.saveable) {
      if (p === "overture" && legacy.businessToken)
        legacyId = (
          await saveBusiness(legacy.businessToken, sourceId, campaignId)
        ).id;
      if (p === "hn" && legacy.hnInput && finding.pipeline === "client")
        legacyId = (
          await saveDiscoveredOpportunity(sourceId, {
            ...legacy.hnInput,
            campaignId,
          })
        ).id;
    }
    const saved = await persistFinding(finding, pipe, legacyId);
    revalidatePath("/acquisition");
    revalidatePath("/opportunities");
    return { saved };
  } catch (e) {
    const m = e instanceof Error ? e.message : "";
    return {
      error:
        /^(Run discovery|Job postings|This finding|Conflicting|Select an existing)/.test(
          m,
        )
          ? m
          : "Could not save this source snapshot. Existing CRM, research and drafts were preserved.",
    };
  }
}
