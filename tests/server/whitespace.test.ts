import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { requestLocalPlan } from "../../src/features/ai/provider";
import type { LeadSnapshot } from "../../src/features/ai/grounding";
test("model evidence choices preserve original spaces and multiline evidence", async () => {
  const previous = process.env.AI_ENABLED;
  const previousUrl = process.env.AI_BASE_URL;
  process.env.AI_ENABLED = "true";
  process.env.AI_BASE_URL = "http://127.0.0.1:8080/v1";
  const quote = "Staff  manually\ncopy orders between systems.";
  const lead: LeadSnapshot = {
    companyName: "Synthetic Company",
    websiteUrl: null,
    contactName: null,
    contactEmail: null,
    notes: "",
    targetService: "automation",
    problemEvidence: quote,
    serviceFitEvidence: "",
    buyingSignalEvidence: "",
    contactRelevanceEvidence: "",
    reachabilityEvidence: "",
    evidenceUrl: "https://example.com/source",
    buyingSignalUrl: null,
  };
  const plan = {
    service: "automation",
    evidenceField: "problemEvidence",
    evidenceQuote: quote,
    nextAction: "verify_need",
  };
  const stub = mock.method(
    globalThis,
    "fetch",
    async (_url: string | URL | Request, options?: RequestInit) => {
      const body = JSON.parse(String(options?.body));
      assert.ok(
        body.response_format.json_schema.schema.properties.evidenceQuote.enum.includes(
          quote,
        ),
      );
      return Response.json({
        choices: [
          { finish_reason: "stop", message: { content: JSON.stringify(plan) } },
        ],
      });
    },
  );
  try {
    assert.deepEqual(await requestLocalPlan(lead), plan);
  } finally {
    stub.mock.restore();
    if (previous === undefined) delete process.env.AI_ENABLED;
    else process.env.AI_ENABLED = previous;
    if (previousUrl === undefined) delete process.env.AI_BASE_URL;
    else process.env.AI_BASE_URL = previousUrl;
  }
});
