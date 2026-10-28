"use server";
import { revalidatePath } from "next/cache";
import { discoverBusinesses } from "./business-source";
import { saveBusiness } from "./business-save";
export async function findBusinessesAction(input: unknown) {
  try {
    return { report: await discoverBusinesses(input) };
  } catch (e) {
    return {
      error:
        e instanceof Error && /^Wait 60/.test(e.message)
          ? e.message
          : "Business discovery unavailable. Install the optional Overture reader using the README commands, or check the network. No results were fabricated or saved.",
    };
  }
}
export async function saveBusinessAction(
  token: string,
  id: string,
  campaignId: string,
) {
  try {
    const saved = await saveBusiness(token, id, campaignId);
    revalidatePath("/opportunities");
    return { saved };
  } catch (e) {
    return {
      error:
        e instanceof Error &&
        /^(Run business|This source|Select an existing)/.test(e.message)
          ? e.message
          : "Could not save business research. Existing records were not overwritten.",
    };
  }
}
