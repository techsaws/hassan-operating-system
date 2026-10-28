import { z } from "zod";
export const annotationInput = z
  .object({
    name: z.string().trim().max(200),
    role: z.string().trim().max(200),
    roleQuote: z.string().trim().max(500),
    routeKind: z.enum([
      "none",
      "email",
      "phone",
      "public_page",
      "customer_booking",
    ]),
    route: z.string().trim().max(2048),
    routePurpose: z.enum([
      "unknown",
      "business_inquiries",
      "b2b_explicit",
      "customer_only",
    ]),
    routeQuote: z.string().trim().max(500),
    workflowQuote: z.string().trim().max(500),
    automationQuestion: z.string().trim().max(500),
    problemQuote: z.string().trim().max(500),
    problemConfirmed: z.boolean(),
    reviewed: z.boolean(),
  })
  .strict();
export type Annotation = z.infer<typeof annotationInput>;
export const blankAnnotation: Annotation = {
  name: "",
  role: "",
  roleQuote: "",
  routeKind: "none",
  route: "",
  routePurpose: "unknown",
  routeQuote: "",
  workflowQuote: "",
  automationQuestion: "",
  problemQuote: "",
  problemConfirmed: false,
  reviewed: false,
};
export type ContactSource = {
  id: string;
  url: string;
  excerpt: string;
  origin: "retrieved" | "operator";
  recordedAt: string;
  annotation: Annotation;
};
export type ContactResearch = { sources: ContactSource[] };
export function usableRoute(a: Annotation) {
  return (
    a.reviewed &&
    ["business_inquiries", "b2b_explicit"].includes(a.routePurpose) &&
    ["email", "phone", "public_page"].includes(a.routeKind) &&
    Boolean(a.route && a.routeQuote)
  );
}
export function contactStatus(research: ContactResearch | null) {
  return research?.sources.some((s) => usableRoute(s.annotation))
    ? "Public business route reviewed — recheck before outreach"
    : "Contact research needed";
}
export function validateAnnotation(raw: unknown, source: ContactSource) {
  const a = annotationInput.parse(raw);
  for (const quote of [
    a.roleQuote,
    a.routeQuote,
    a.workflowQuote,
    a.problemQuote,
  ])
    if (quote && !source.excerpt.includes(quote))
      throw new Error("Evidence must be a verbatim excerpt from this source.");
  if (a.name && (!a.roleQuote || !a.roleQuote.includes(a.name)))
    throw new Error(
      "Published contact name must occur in its role evidence quote.",
    );
  if (a.role && !a.roleQuote)
    throw new Error("Record role evidence before assigning a role.");
  if (a.routeKind === "none") {
    if (a.route) throw new Error("Choose a route type.");
  } else {
    if (!a.route || !a.routeQuote)
      throw new Error("Record a published route and its evidence quote.");
    if (a.routeKind === "email") {
      if (
        !z.email().safeParse(a.route).success ||
        !source.excerpt.toLowerCase().includes(a.route.toLowerCase())
      )
        throw new Error(
          "Email must be published verbatim in the source; never guess patterns.",
        );
    } else if (a.routeKind === "phone") {
      const digits = a.route.replace(/\D/g, "");
      if (
        digits.length < 7 ||
        !source.excerpt.replace(/\D/g, "").includes(digits)
      )
        throw new Error("Phone must appear in the source.");
    } else {
      const url = new URL(a.route);
      if (
        !["http:", "https:"].includes(url.protocol) ||
        url.username ||
        url.password
      )
        throw new Error(
          "Use a public HTTP(S) contact route without credentials.",
        );
      if (a.route !== source.url && !source.excerpt.includes(a.route))
        throw new Error(
          "Use the recorded contact-page URL or an explicitly published route URL.",
        );
    }
  }
  if (a.problemQuote && !a.problemConfirmed)
    throw new Error(
      "Confirm that the problem quote describes an actual business problem, not a missing feature or customer HVAC issue.",
    );
  if (a.problemConfirmed && !a.problemQuote)
    throw new Error("A confirmed problem requires original evidence.");
  return a;
}
