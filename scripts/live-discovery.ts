import { discoverHn } from "../src/features/discovery/source";
async function main() {
  const report = await discoverHn({
    campaignId: "00000000-0000-4000-8000-000000000005",
    targetService: "automation",
    country: "United States",
    buyerCategory: "small_business",
    keywords: "",
    includeUnknown: true,
  });
  console.log(
    JSON.stringify(
      {
        checkedAt: report.checkedAt,
        source: report.source,
        cutoff: report.cutoff,
        scanned: report.scanned,
        upstreamComments: report.upstreamComments,
        partial: report.partial,
        classifications: report.classifications,
        relevant: report.matching,
        identifiableCompanies: report.companies,
        sourceProvidedContactRoutes: report.contactRoutes,
        worthReviewing: report.worthReviewing,
        usefulSourceUrls: report.findings
          .filter((f) => f.saveable)
          .map((f) => f.sourceUrl),
        threads: report.threads,
        explanation: report.explanation,
      },
      null,
      2,
    ),
  );
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Live discovery failed");
  process.exitCode = 1;
});
