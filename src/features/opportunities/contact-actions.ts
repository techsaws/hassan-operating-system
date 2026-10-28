"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  researchContact,
  recordManualContactSource,
  annotateContactSource,
} from "./contact-research";
import { getOpportunity } from "./queries";
import {
  prepareResearchedApproach,
  saveReviewedApproachDraft,
} from "./approach";
const error = (e: unknown) => ({
  error:
    e instanceof Error &&
    /^(Evidence|Published|Record|Email|Phone|Use the|Confirm|A confirmed|Review|Local |The local|Source|Unsupported|Robots|Public|Page|Research|Eight|Choose)/.test(
      e.message,
    )
      ? e.message
      : "Research could not be completed. Continue manually; existing evidence and drafts were preserved.",
});
export async function contactSourceAction(
  id: string,
  url: string,
  consent: boolean,
  manual: string | null,
) {
  try {
    const opportunity =
      manual === null
        ? await researchContact(id, url, consent)
        : await recordManualContactSource(id, url, manual);
    revalidatePath("/opportunities");
    return { opportunity };
  } catch (e) {
    return error(e);
  }
}
export async function contactAnnotationAction(
  id: string,
  sourceId: string,
  input: unknown,
) {
  try {
    const opportunity = await annotateContactSource(id, sourceId, input);
    revalidatePath("/opportunities");
    return { opportunity };
  } catch (e) {
    return error(e);
  }
}
export async function researchedApproachAction(id: string) {
  try {
    z.uuid().parse(id);
    const o = await getOpportunity(id);
    if (!o) throw new Error();
    return { approach: await prepareResearchedApproach(o) };
  } catch (e) {
    return error(e);
  }
}
export async function saveResearchedDraftAction(
  id: string,
  subject: string,
  body: string,
  approved: boolean,
) {
  try {
    const saved = await saveReviewedApproachDraft(id, subject, body, approved);
    revalidatePath("/opportunities");
    revalidatePath("/leads");
    return saved;
  } catch (e) {
    return error(e);
  }
}
