import { z } from "zod";
export const businessInput = z.object({
  area: z.enum(["raleigh", "austin", "tampa"]),
  trade: z.enum(["all", "hvac", "plumbing", "electrical"]),
});
export const businessRecord = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(200),
  category: z.enum(["hvac_service", "plumbing", "electrician"]),
  city: z.string().max(200).nullable(),
  region: z.string().max(100).nullable(),
  country: z.literal("US"),
  websites: z.array(z.string().max(2048)).max(20),
  phones: z.array(z.string().max(80)).max(20),
  confidence: z.number().min(0).max(1).nullable(),
  status: z.string().max(80).nullable(),
  sources: z
    .array(
      z.object({
        dataset: z.string().max(100).nullable(),
        license: z.string().max(100).nullable(),
        updateTime: z.string().max(100).nullable(),
      }),
    )
    .max(100),
});
export const businessResponse = z.object({
  release: z.string().regex(/^\d{4}-\d{2}-\d{2}\.\d+$/),
  scanned: z.number().int().nonnegative(),
  limited: z.boolean(),
  businesses: z.array(businessRecord).max(20),
});
export type BusinessInput = z.infer<typeof businessInput>;
export type BusinessRecord = z.infer<typeof businessRecord>;
export type BusinessReport = z.infer<typeof businessResponse> & {
  token: string;
  checkedAt: string;
  input: BusinessInput;
};
export const workflowQuestion =
  "Research question only: how are incoming service requests assigned, scheduled, and followed up? No problem or buying intent established.";
