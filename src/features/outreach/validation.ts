import { z } from "zod";
export const draftInput = z
  .object({
    id: z.uuid().nullable(),
    leadId: z.uuid(),
    channel: z.enum(["email", "linkedin"]),
    subject: z.string().trim().max(200),
    body: z.string().trim().min(1, "Write a message before saving.").max(10000),
  })
  .superRefine((v, ctx) => {
    if (v.channel === "email" && !v.subject)
      ctx.addIssue({
        code: "custom",
        path: ["subject"],
        message: "Email subject is required.",
      });
  });
