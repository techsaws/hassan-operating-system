"use server";
import { revalidatePath } from "next/cache";
import { discoverHn } from "./source";
import { saveDiscoveredOpportunity } from "./save";
let nextSearchAt = 0;
let nextSaveAt = 0;
export async function findLeadsAction(input: unknown) {
  if (Date.now() < nextSearchAt)
    return {
      error:
        "Wait 30 seconds between discovery runs. Review results or use the manual search links meanwhile.",
    };
  nextSearchAt = Date.now() + 30000;
  try {
    return { report: await discoverHn(input) };
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    return {
      error: /^(HN |No |Source |Invalid )/.test(message)
        ? message
        : "Discovery unavailable or timed out. No prospects were fabricated or saved. Use the prepared manual search links.",
    };
  }
}
export async function saveFindingAction(itemId: string, input: unknown) {
  if (Date.now() < nextSaveAt)
    return { error: "Please wait two seconds before saving another finding." };
  nextSaveAt = Date.now() + 2000;
  try {
    const result = await saveDiscoveredOpportunity(itemId, input);
    revalidatePath("/opportunities");
    return { saved: result };
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    return {
      error:
        /^(HN |This refreshed|The source|Only original|Select an existing|Invalid discovery)/.test(
          message,
        )
          ? message
          : "Could not save the source result. Check the campaign and connection. Existing research was not overwritten.",
    };
  }
}
