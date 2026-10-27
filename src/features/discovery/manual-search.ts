import type { DiscoveryInput } from "./types";
export function manualSearches(
  input: Pick<
    DiscoveryInput,
    "targetService" | "country" | "buyerCategory" | "keywords"
  >,
) {
  const service = {
    automation: '"CRM" "automation"',
    software: '"web application" developer',
    backend: '"API integration" developer',
    security: '"application security" consultant',
  }[input.targetService];
  const country = input.country.toLowerCase() === "any" ? "" : input.country;
  const buyer =
    input.buyerCategory === "small_business"
      ? '"small business"'
      : input.buyerCategory === "startup"
        ? "startup"
        : "";
  return [
    {
      label: "Public requests for paid help",
      query:
        `${country} ${buyer} ${service} "looking for" ${input.keywords}`.trim(),
    },
    {
      label: "Freelance project requests",
      query:
        `${country} ${service} "hiring" "freelance" ${input.keywords}`.trim(),
    },
    {
      label: "HN buyer requests",
      query:
        `site:news.ycombinator.com "SEEKING FREELANCER" ${service} ${input.keywords}`.trim(),
    },
  ].map((q) => ({
    ...q,
    url: `https://www.google.com/search?q=${encodeURIComponent(q.query)}`,
  }));
}
