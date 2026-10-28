import { test } from "node:test";
import assert from "node:assert/strict";
import type { Opportunity } from "../../src/db/schema";
import {
  blankAnnotation,
  type ContactSource,
} from "../../src/features/opportunities/contact-types";
import { prepareResearchedApproach } from "../../src/features/opportunities/approach";
const source: ContactSource = {
  id: crypto.randomUUID(),
  url: "https://example.com/service",
  origin: "operator",
  recordedAt: new Date().toISOString(),
  excerpt: "Our team calls to schedule after a service request.",
  annotation: {
    ...blankAnnotation,
    workflowQuote: "Our team calls to schedule after a service request.",
    reviewed: true,
    routeKind: "customer_booking",
    route: "https://example.com/service",
    routeQuote: "Our team calls to schedule after a service request.",
    routePurpose: "customer_only",
  },
};
const o = {
  companyName: "Synthetic HVAC",
  sourceUrl: "https://example.com",
  targetService: "automation",
  contactResearch: { sources: [source] },
} as Opportunity;
test("researched approach uses exact grounded quotes, excludes booking routes and makes uncertainty explicit", async () => {
  const r = await prepareResearchedApproach(o, async () => ({
    service: "automation",
    evidenceField: "serviceFitEvidence",
    evidenceQuote: source.annotation.workflowQuote,
    nextAction: "verify_need",
  }));
  assert.equal(r.route, null);
  assert.equal(r.canSaveEmail, false);
  assert.equal(r.status, "Contact research needed");
  assert.match(r.body, /I don’t know/);
  assert.ok(!r.body.includes("losing"));
  assert.equal(r.source, source.url);
  await assert.rejects(
    prepareResearchedApproach(o, async () => ({
      service: "automation",
      evidenceField: "problemEvidence",
      evidenceQuote: "They waste money.",
      nextAction: "review_outreach",
    })),
    /Ungrounded/,
  );
});
test("unreviewed evidence and unavailable models do not produce fake personalized messages", async () => {
  await assert.rejects(
    prepareResearchedApproach({ ...o, contactResearch: null }),
    /Review and save/,
  );
  await assert.rejects(
    prepareResearchedApproach(o, async () => {
      throw new Error("Local model unavailable");
    }),
    /Local model unavailable/,
  );
  const r = await prepareResearchedApproach(o, async () => ({
    service: "automation",
    evidenceField: "none",
    evidenceQuote: "",
    nextAction: "verify_need",
  }));
  assert.equal(r.evidence, null);
  assert.match(r.angle, /insufficient evidence/);
});
