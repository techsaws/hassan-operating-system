"use server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { leads } from "@/db/schema";
import { leadInput, type FormState } from "./validation";
export async function saveLead(
  id: string | null,
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const values = Object.fromEntries(
    Object.keys(leadInput.shape).map((name) => {
      const value = form.get(name);
      return [name, typeof value === "string" ? value.slice(0, 20000) : ""];
    }),
  );
  if (id !== null && !z.uuid().safeParse(id).success)
    return { message: "Invalid lead ID." };
  const result = leadInput.safeParse(Object.fromEntries(form));
  if (!result.success)
    return {
      values,
      errors: z.flattenError(result.error).fieldErrors,
      message: "Check the highlighted fields.",
    };
  try {
    if (id) {
      const updated = await getDb()
        .update(leads)
        .set({ ...result.data, updatedAt: new Date() })
        .where(eq(leads.id, id))
        .returning({ id: leads.id });
      if (!updated.length)
        return { values, message: "This lead no longer exists." };
    } else await getDb().insert(leads).values(result.data);
  } catch (error) {
    const e = error as { code?: string; cause?: { code?: string } };
    if (e.code === "23505" || e.cause?.code === "23505")
      return {
        values,
        errors: { contactEmail: ["A lead with this email already exists."] },
        message: "Email must be unique.",
      };
    return {
      values,
      message:
        "Could not save. Check your PostgreSQL connection and migrations, then try again.",
    };
  }
  revalidatePath("/");
  revalidatePath("/leads");
  redirect("/leads");
}
