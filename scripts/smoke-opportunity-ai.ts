import { config } from "dotenv";
config({ path: ".env", quiet: true });
import assert from "node:assert/strict";
import type { Opportunity } from "../src/db/schema";
import { analyzeOpportunity } from "../src/features/opportunities/analysis";
async function main() {
  const o: Opportunity = {
    discovery: null,
    contactResearch: null,
    id: crypto.randomUUID(),
    companyName: "Synthetic Opportunity Verification",
    sourceUrl: "https://example.com/test-source",
    platform: "Synthetic operator test",
    observedNeed: "Scheduling and CRM integration help requested",
    operatorEvidence:
      "We are looking for technical help connecting scheduling and our CRM system.",
    contactName: null,
    contactEmail: null,
    targetService: "automation",
    campaignId: null,
    leadId: null,
    decisionMakerEvidence: null,
    explicitRequest: 1,
    needDate: null,
    followUpDate: null,
    retrievedEvidence: null,
    retrievedUrl: null,
    retrievedAt: null,
    retrievalStatus: "not_retrieved",
    retrievalMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const start = performance.now();
  const result = await analyzeOpportunity(o, "operator");
  assert.equal(result.origin, "operator");
  assert.equal(result.retrievedAt, null);
  assert.equal(result.explicitNeedQuote, o.operatorEvidence);
  assert.equal(result.readiness, "Research needed");
  assert.ok(result.missing.includes("contact email"));
  await assert.rejects(
    analyzeOpportunity({ ...o, operatorEvidence: null }, "operator"),
    /Record evidence/,
  );
  console.log(
    JSON.stringify({
      scenario: "synthetic operator assertion; real local Qwen inference",
      passed: true,
      seconds: Number(((performance.now() - start) / 1000).toFixed(2)),
      missingDetails: result.missing.length,
      readiness: result.readiness,
      persistence: "No data written",
    }),
  );
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Opportunity AI smoke failed");
  process.exitCode = 1;
});
