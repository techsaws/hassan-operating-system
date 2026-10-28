import { test } from "node:test";
import assert from "node:assert/strict";
import {
  discoverBusinesses,
  selectedBusiness,
  businessWebsite,
  websiteKey,
} from "../../src/features/discovery/business-source";
import {
  businessInput,
  businessResponse,
} from "../../src/features/discovery/business-types";
test("business research accepts only bounded queries, separates catalogue assertions from needs, and rejects untrusted saves", async () => {
  assert.equal(
    businessInput.safeParse({ area: "../../etc", trade: "all" }).success,
    false,
  );
  assert.equal(
    businessInput.safeParse({ area: "raleigh", trade: "shell-command" })
      .success,
    false,
  );
  for (const url of [
    "javascript:alert(1)",
    "http://127.0.0.1/",
    "http://host.local/",
    "https://user:password@example.com",
    "https://linkedin.com/company/test",
  ])
    assert.equal(businessWebsite(url), null);
  assert.equal(websiteKey("http://www.example.com/"), "example.com");
  const id = crypto.randomUUID();
  const row = {
    id,
    name: "Synthetic HVAC",
    category: "hvac_service",
    city: "Example City",
    region: "NC",
    country: "US",
    websites: ["https://example.com/", "javascript:alert(1)"],
    phones: [],
    confidence: 0.9,
    status: null,
    sources: [],
  };
  assert.equal(
    businessResponse.safeParse({
      release: "evil",
      scanned: 1,
      limited: false,
      businesses: [row],
    }).success,
    false,
  );
  assert.equal(
    businessResponse.safeParse({
      release: "2026-10-21.0",
      scanned: 1,
      limited: false,
      businesses: [{ ...row, country: "CA" }],
    }).success,
    false,
  );
  let calls = 0;
  const report = await discoverBusinesses(
    { area: "raleigh", trade: "all" },
    async () => {
      calls++;
      return {
        release: "2026-10-21.0",
        scanned: 50,
        limited: false,
        businesses: [
          row,
          { ...row, id: crypto.randomUUID(), status: "permanently_closed" },
        ],
      };
    },
  );
  assert.deepEqual(report.businesses[0].websites, ["https://example.com/"]);
  assert.equal("buyingIntent" in report.businesses[0], false);
  assert.equal(
    selectedBusiness(report.token, id).business.name,
    "Synthetic HVAC",
  );
  assert.throws(
    () => selectedBusiness(report.token, crypto.randomUUID()),
    /expired/,
  );
  assert.throws(() => selectedBusiness(crypto.randomUUID(), id), /expired/);
  assert.throws(
    () => selectedBusiness(report.token, report.businesses[1].id),
    /closed/,
  );
  await assert.rejects(
    discoverBusinesses({ area: "raleigh", trade: "all" }, async () => {
      calls++;
      return {};
    }),
    /Wait 60/,
  );
  assert.equal(calls, 1);
  const original = Date.now;
  try {
    Date.now = () => original() + 601000;
    assert.throws(() => selectedBusiness(report.token, id), /expired/);
    await assert.rejects(
      discoverBusinesses({ area: "raleigh", trade: "all" }, async () => {
        throw new Error("upstream unavailable");
      }),
      /upstream unavailable/,
    );
  } finally {
    Date.now = original;
  }
});
