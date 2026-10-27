import { retrievePublicPage } from "../src/features/opportunities/retrieval";
async function main() {
  const result = await retrievePublicPage("https://example.com/");
  console.log(
    JSON.stringify({
      source: result.sourceUrl,
      retrievedAt: result.retrievedAt.toISOString(),
      excerptCharacters: result.excerpt.length,
      passed:
        result.excerpt.includes("Example") ||
        result.excerpt.includes("example"),
    }),
  );
  try {
    await retrievePublicPage("https://www.linkedin.com/company/example/");
    throw new Error("Restricted URL unexpectedly allowed");
  } catch (e) {
    if (!(e instanceof Error) || !/Unsupported or restricted/.test(e.message))
      throw e;
    console.log(
      "Restricted platform refused before any automated platform request.",
    );
  }
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Public retrieval failed");
  process.exitCode = 1;
});
