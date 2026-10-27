import { test } from "node:test";
import assert from "node:assert/strict";
import {
  opportunityInput,
  normalizeOpportunityUrl,
} from "../src/features/opportunities/validation";
import { assessOpportunity } from "../src/features/opportunities/assessment";
import type { Opportunity } from "../src/db/schema";
export const blankOpportunity: Opportunity = {
  discovery: null,
  id: crypto.randomUUID(),
  companyName: null,
  sourceUrl: null,
  platform: null,
  observedNeed: null,
  operatorEvidence: null,
  contactName: null,
  contactEmail: null,
  targetService: null,
  campaignId: null,
  leadId: null,
  decisionMakerEvidence: null,
  explicitRequest: 0,
  needDate: null,
  followUpDate: null,
  retrievedAt: null,
  retrievedUrl: null,
  retrievedEvidence: null,
  retrievalStatus: "not_retrieved",
  retrievalMessage: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const raw = {
  companyName: "",
  sourceUrl: "https://example.com/request?utm_source=x#anchor",
  platform: "",
  observedNeed: "",
  operatorEvidence: "",
  contactName: "",
  contactEmail: "",
  targetService: "",
  campaignId: "",
  decisionMakerEvidence: "",
  explicitRequest: "no",
  needDate: "",
  followUpDate: "",
};
test("URL-only and incomplete research retain unknown values and canonicalize duplicate URLs", () => {
  const data = opportunityInput.parse(raw);
  assert.equal(data.companyName, null);
  assert.equal(data.sourceUrl, "https://example.com/request");
  assert.equal(data.contactEmail, null);
  assert.equal(
    normalizeOpportunityUrl(
      "https://EXAMPLE.com/request?b=2&a=1&gclid=tracking#x",
    ),
    "https://example.com/request?a=1&b=2",
  );
  assert.equal(
    opportunityInput.safeParse({ ...raw, sourceUrl: "" }).success,
    false,
  );
  assert.equal(
    opportunityInput.safeParse({ ...raw, contactEmail: "bad" }).success,
    false,
  );
  assert.equal(
    opportunityInput.safeParse({ ...raw, sourceUrl: "javascript:alert(1)" })
      .success,
    false,
  );
  assert.equal(
    opportunityInput.parse({
      ...raw,
      sourceUrl: "",
      observedNeed: "Unfinished research note",
    }).observedNeed,
    "Unfinished research note",
  );
});
test("missing evidence and unsupported assertions cannot create outreach readiness or positive recency", () => {
  const missing = assessOpportunity(
    {
      ...blankOpportunity,
      companyName: "Synthetic",
      explicitRequest: 1,
      needDate: "2026-10-28",
      observedNeed: "A claimed need",
    },
    "2026-10-28",
  );
  assert.equal(missing.readiness, "Research needed");
  assert.match(missing.signal, /Unknown/);
  assert.equal(missing.recent, false);
  assert.equal(missing.priority, 0);
  assert.ok(missing.missing.includes("original evidence"));
  const background = assessOpportunity(
    {
      ...blankOpportunity,
      retrievedEvidence: "Generic company background only",
      retrievedUrl: "https://example.com",
    },
    "2026-10-28",
  );
  assert.equal(background.priority, 0);
  assert.match(background.signal, /explicit need.*unconfirmed/);
  assert.equal(
    assessOpportunity(
      {
        ...blankOpportunity,
        retrievedAt: new Date(),
        retrievedEvidence: "Public background",
        retrievedUrl: "https://example.com",
      },
      "2026-10-28",
    ).recent,
    false,
  );
});
test("due followups and documented recent requests are prioritized without calling intent verified", () => {
  const due = assessOpportunity(
    { ...blankOpportunity, followUpDate: "2026-10-27" },
    "2026-10-28",
  );
  assert.equal(due.due, true);
  assert.equal(due.priority, 60);
  const full = assessOpportunity(
    {
      ...blankOpportunity,
      companyName: "Synthetic",
      sourceUrl: "https://example.com/request",
      observedNeed: "CRM integration help requested",
      operatorEvidence:
        "Looking for technical help connecting scheduling and CRM.",
      targetService: "automation",
      contactName: "Test Contact",
      contactEmail: "test@example.com",
      decisionMakerEvidence: "Operator recorded owner role",
      explicitRequest: 1,
      needDate: "2026-10-25",
    },
    "2026-10-28",
  );
  assert.equal(full.recent, true);
  assert.equal(full.readiness, "Human outreach review");
  assert.match(full.signal, /Operator reports/);
  assert.equal(full.priority, 80);
});
