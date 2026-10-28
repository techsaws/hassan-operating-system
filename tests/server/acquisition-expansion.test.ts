import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeAgency,
  agencyResponse,
} from "../../src/features/acquisition/agencies";
import {
  normalizeRemoteOk,
  remoteOkResponse,
  remoteLocation,
} from "../../src/features/acquisition/remoteok";
import { publicJson } from "../../src/features/acquisition/cached-source";
import { normalizeRemotive } from "../../src/features/acquisition/normalize";
import {
  openingKey,
  uniqueJobFindings,
} from "../../src/features/acquisition/job-identity";
import { syntheticJob } from "../fixtures/acquisition";
const now = "2026-10-28T12:00:00Z";
const agency = {
  slug: "synthetic-agency",
  name: "Synthetic Agency",
  tagline: "Web applications and integrations",
  location: { country: "United States", city: "Example City" },
  services: ["Web Development", "AI Automation"],
  team_size: "11-50",
  website: "https://example.com",
  profile_url: "https://www.pickanagency.com/agencies/synthetic-agency",
};
const job = {
  id: "799999991",
  url: "https://remoteok.com/remote-jobs/synthetic-799999991",
  position: "Backend Developer",
  company: "Synthetic Employer",
  description:
    "<p>Build backend APIs in Python.</p><p>Independent contractor. Remote, any location.</p>",
  date: "2026-10-26T12:00:00+00:00",
  location: "",
  tags: ["Python"],
  salary_min: 0,
  salary_max: 0,
};
test("agency services, size and official-site assertions are not partnership demand, contact permission or budget", () => {
  const f = normalizeAgency(agency, now);
  assert.equal(f.pipeline, "partnership");
  assert.equal(f.demand, "hypothesis");
  assert.equal(f.signal, null);
  assert.equal(f.compensation, null);
  assert.equal(f.agency?.leadership, null);
  assert.equal(f.agency?.partnershipRoute, null);
  assert.equal(f.agency?.teamSize, "11-50");
  assert.equal(f.route?.purpose, "business_research");
  assert.equal(f.worthReviewing, true);
  assert.equal(
    normalizeAgency({ ...agency, tagline: "FBI law enforcement services" }, now)
      .worthReviewing,
    false,
  );
  assert.throws(() =>
    normalizeAgency(
      { ...agency, profile_url: "https://evil.example.com/profile" },
      now,
    ),
  );
  assert.equal(
    agencyResponse.safeParse({
      results: [
        { ...agency, website: "https://example.com", services: undefined },
      ],
    }).success,
    false,
  );
});
test("Remote OK empty location and digital nomad tags never confirm Pakistan or manufacture employment/pay", () => {
  const f = normalizeRemoteOk(
    { ...job, tags: ["digital nomad", "Python"] },
    now,
  );
  assert.equal(f.provider, "remoteok");
  assert.equal(f.pakistanEligibility, "unknown");
  assert.equal(f.geography, "unknown");
  assert.equal(f.compensation, null);
  assert.equal(f.currency, null);
  assert.ok(f.arrangements.includes("independent_contractor"));
  assert.equal(
    remoteLocation(
      "",
      "Our company is based in the US. We serve worldwide customers.",
    ).value,
    "",
  );
  assert.equal(
    normalizeRemoteOk(
      {
        ...job,
        description:
          "<p>Remote role based in Latin America. Build Python APIs.</p>",
      },
      now,
    ).pakistanEligibility,
    "excluded",
  );
  assert.equal(
    normalizeRemoteOk(
      {
        ...job,
        description:
          "<p>Candidates must live in Pakistan. Build Python APIs.</p>",
      },
      now,
    ).pakistanEligibility,
    "confirmed",
  );
  assert.equal(
    normalizeRemoteOk(
      {
        ...job,
        position: "Sales Development Representative",
        description:
          "<p>Build sales pipelines for software development clients using APIs and CRM.</p>",
      },
      now,
    ).demand,
    "irrelevant",
  );
  assert.equal(
    normalizeRemoteOk(
      {
        ...job,
        description:
          "<p>Full time. Permanent or contract. Build Python APIs.</p>",
      },
      now,
    ).arrangements.includes("contract_unspecified"),
    true,
  );
});
test("cross-source duplicate openings require exact published application target, employer and normalized title", () => {
  const html =
    "<p>Build Python APIs.</p><p>Apply at https://example.com/careers/job-123</p>";
  const a = normalizeRemotive({ ...syntheticJob, description: html }, now);
  const b = normalizeRemoteOk(
    { ...job, position: syntheticJob.title, description: html },
    now,
  );
  assert.equal(openingKey(a), openingKey(b));
  assert.equal(uniqueJobFindings([b], [a]).duplicates, 1);
  assert.equal(
    uniqueJobFindings(
      [{ ...b, applicationTarget: "https://example.com/careers/other" }],
      [a],
    ).duplicates,
    0,
  );
  assert.equal(
    uniqueJobFindings([{ ...b, title: "Different engineering opening" }], [a])
      .duplicates,
    0,
  );
  assert.equal(
    openingKey({
      ...b,
      applicationTarget: null,
      excerpt: "No application URL published.",
    }),
    null,
  );
});
test("new APIs fail honestly on access/type/size errors; Remote OK metadata is not a job", async () => {
  const meta = { legal: "API terms: attribution and follow link required." };
  assert.equal(remoteOkResponse.parse([meta, job]).length, 2);
  await assert.rejects(
    publicJson("https://remoteok.com/api", async (_url, init) => {
      assert.equal(init?.redirect, "error");
      return new Response("blocked", { status: 403 });
    }),
    /HTTP 403/,
  );
  await assert.rejects(
    publicJson(
      "https://remoteok.com/api",
      async () =>
        new Response("html", { headers: { "content-type": "text/html" } }),
    ),
    /content type/,
  );
  await assert.rejects(
    publicJson(
      "https://remoteok.com/api",
      async () =>
        new Response("x".repeat(4 * 1024 * 1024 + 1), {
          headers: { "content-type": "application/json" },
        }),
    ),
    /4 MiB/,
  );
});
