"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { writeLead } from "./mutations";
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
    const saved = await writeLead(id, result.data);
    if (!saved) return { values, message: "This lead no longer exists." };
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
