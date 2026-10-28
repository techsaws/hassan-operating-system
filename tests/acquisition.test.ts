import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeRemotive,
  eligibility,
  workArrangements,
  canonicalUrl,
  organizationDomain,
  countsFor,
} from "../src/features/acquisition/normalize";
import {
  emptyFilters,
  filterFinding,
  arrangements,
} from "../src/features/acquisition/types";
import {
  sourceRegistry,
  sourceCategories,
} from "../src/features/acquisition/registry";
import { syntheticJob } from "./fixtures/acquisition";
const now = "2026-10-28T12:00:00Z";
test("remote is not Pakistan eligibility; explicit fields, exclusions and contradictions remain distinct", () => {
  assert.equal(
    eligibility("", "This is remote.").pakistanEligibility,
    "unknown",
  );
  assert.equal(
    eligibility("Worldwide", "Remote, any location.").pakistanEligibility,
    "unknown",
  );
  assert.equal(eligibility("APAC", "").pakistanEligibility, "unknown");
  assert.equal(eligibility("Pakistan", "").pakistanEligibility, "confirmed");
  assert.equal(eligibility("US only", "").pakistanEligibility, "excluded");
  assert.equal(eligibility("EU only", "").geography, "eu_only");
  assert.equal(
    eligibility("Worldwide except Pakistan", "").pakistanEligibility,
    "excluded",
  );
  assert.equal(
    eligibility("Worldwide", "Must be based in Canada.").geography,
    "other_restricted",
  );
});
test("engineering demand uses content without trusting incidental tags or manufacturing unknown fields", () => {
  const f = normalizeRemotive(syntheticJob, now);
  assert.equal(f.pipeline, "job");
  assert.equal(f.demand, "explicit_demand");
  assert.equal(f.identity?.domain, null);
  assert.equal(f.identity?.providerId, null);
  assert.equal(f.currency, null);
  assert.equal(f.compensation, null);
  assert.equal(f.deadline, null);
  assert.equal(f.competition, null);
  assert.equal(f.route?.purpose, "application");
  assert.ok(f.arrangements.includes("independent_contractor"));
  assert.ok(f.arrangements.includes("contract_unspecified"));
  const noise = normalizeRemotive(
    {
      ...syntheticJob,
      title: "Remote Office Assistant",
      description: "<p>Bookkeeping and billing support.</p>",
      tags: ["Python", "React", "REST"],
    },
    now,
  );
  assert.equal(noise.demand, "irrelevant");
  assert.equal(noise.worthReviewing, false);
  const specialist = normalizeRemotive(
    {
      ...syntheticJob,
      title: "Technical Consultant",
      description: "<p>Develop software and backend APIs with Python.</p>",
    },
    now,
  );
  assert.equal(specialist.demand, "explicit_demand");
});
test("arrangements retain multiple/ambiguous types, closed/expired posts and source compensation", () => {
  const f = normalizeRemotive(
    {
      ...syntheticJob,
      salary: "US$100 per hour",
      description:
        syntheticJob.description +
        "<p>Part-time, fixed-term independent contractor. Application deadline: 2026-10-20.</p>",
    },
    now,
  );
  assert.equal(f.currency, "USD");
  assert.equal(f.status, "expired");
  assert.equal(f.worthReviewing, false);
  assert.ok(f.arrangements.includes("fixed_term"));
  assert.ok(f.arrangements.includes("part_time"));
  assert.equal(
    normalizeRemotive(
      { ...syntheticJob, description: "<p>Applications are closed.</p>" },
      now,
    ).status,
    "closed",
  );
  assert.equal(
    normalizeRemotive({ ...syntheticJob, publication_date: "not a date" }, now)
      .publishedAt,
    null,
  );
  assert.equal(
    normalizeRemotive(
      { ...syntheticJob, publication_date: "2025-01-01T12:00:00" },
      now,
    ).status,
    "stale",
  );
  assert.deepEqual(workArrangements("", "No arrangement published."), [
    "unknown",
  ]);
  for (const type of [
    "full_time",
    "part_time",
    "fixed_term",
    "independent_contractor",
    "freelance",
    "project",
    "hourly",
    "retainer",
    "temporary",
    "internship",
    "apprenticeship",
    "contract_to_hire",
    "fractional",
    "agency_subcontract",
    "recurring",
  ])
    assert.ok(arrangements.includes(type as (typeof arrangements)[number]));
});
test("unified filters, deterministic URL/domain identities and counts preserve uncertainty", () => {
  const f = normalizeRemotive(syntheticJob, now);
  assert.equal(
    filterFinding(
      f,
      {
        ...emptyFilters,
        skill: "Python",
        pipeline: "job",
        geography: "worldwide",
      },
      Date.parse(now),
    ),
    true,
  );
  assert.equal(
    filterFinding(f, { ...emptyFilters, geography: "pakistan_eligible" }),
    false,
  );
  assert.equal(
    filterFinding(f, { ...emptyFilters, freshness: "1" }, Date.parse(now)),
    false,
  );
  assert.equal(
    canonicalUrl("https://example.com/job?id=2&utm_source=test#x"),
    "https://example.com/job?id=2",
  );
  assert.equal(
    organizationDomain("http://www.example.com/about"),
    "example.com",
  );
  assert.equal(organizationDomain("https://facebook.com/example"), null);
  assert.throws(() => canonicalUrl("http://127.0.0.1/"));
  assert.throws(() => canonicalUrl("javascript:alert(1)"));
  const counts = countsFor([f]);
  assert.equal(counts.pakistanConfirmed, 0);
  assert.equal(counts.eligibilityUnknown, 1);
  assert.equal(counts.worthReviewing, 1);
});
test("all nine registry categories exist and future providers cannot masquerade as connected", () => {
  assert.equal(sourceCategories.length, 9);
  for (const category of sourceCategories)
    assert.ok(sourceRegistry.some((s) => s.category === category));
  for (const id of [
    "google_places",
    "reddit",
    "youtube",
    "apollo",
    "github",
    "linkedin",
  ]) {
    const source = sourceRegistry.find((s) => s.id === id)!;
    assert.ok(["restricted", "setup_required"].includes(source.status));
    assert.match(source.setup, /Not implemented/);
  }
});
