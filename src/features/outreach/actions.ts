"use server";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { writeDraft } from "./mutations";
export async function saveDraft(input: unknown) {
  try {
    const draft = await writeDraft(input);
    revalidatePath(`/leads/${draft.leadId}/edit`);
    return { draft };
  } catch (e) {
    return {
      error:
        e instanceof ZodError
          ? e.issues.map((i) => i.message).join(" ")
          : "Could not save draft. Check the lead, draft, and database connection, then retry.",
    };
  }
}
