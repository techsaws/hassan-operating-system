import { test } from "node:test";
import assert from "node:assert/strict";
import {
  discoverHn,
  refreshFinding,
  hnJson,
} from "../../src/features/discovery/source";
import type { DiscoveryInput } from "../../src/features/discovery/types";
const input: DiscoveryInput = {
  campaignId: crypto.randomUUID(),
  targetService: "automation",
  country: "United States",
  buyerCategory: "small_business",
  keywords: "",
  includeUnknown: true,
};
const buyerText =
  "SEEKING FREELANCER<p>Company: Synthetic Test Company</p><p>We are a small business. Need a paid developer for CRM scheduling automation.</p><p>Company country: United States</p><p>Email: test@example.com</p>";
function fixture(): { fetcher: typeof fetch; calls: string[] } {
  const calls: string[] = [];
  const fetcher: typeof fetch = async (url, init) => {
    const value = String(url);
    calls.push(value);
    assert.ok(value.startsWith("https://hn.algolia.com/api/v1/"));
    assert.equal(init?.redirect, "error");
    assert.ok(init?.signal);
    assert.equal(init?.method, undefined);
    const date = new Date().toISOString();
    if (value.includes("/items/12345"))
      return Response.json({
        id: 12345,
        type: "comment",
        parent_id: 999,
        text: buyerText,
        author: "synthetic-buyer",
        created_at: date,
      });
    if (value.includes("/items/999"))
      return Response.json({
        id: 999,
        type: "story",
        title: "Ask HN: Freelancer? Seeking freelancer? (October 2026)",
        author: "synthetic-host",
        created_at: date,
      });
    if (value.includes("tags=story"))
      return Response.json({
        nbHits: 1,
        nbPages: 1,
        hits: [
          {
            objectID: "999",
            title: "Ask HN: Freelancer? Seeking freelancer? (October 2026)",
            author: "synthetic-host",
            created_at: date,
          },
        ],
      });
    return Response.json({
      nbHits: 3,
      nbPages: 1,
      hits: [
        {
          objectID: "12345",
          parent_id: 999,
          author: "synthetic-buyer",
          created_at: date,
          comment_text: buyerText,
        },
        {
          objectID: "12346",
          parent_id: 999,
          author: "synthetic-seller",
          created_at: date,
          comment_text:
            "SEEKING WORK | Automation freelancer, email: not-collected@example.com",
        },
        {
          objectID: "12347",
          parent_id: 12345,
          author: "synthetic-reply",
          created_at: date,
          comment_text: "Here is an informational discussion about automation.",
        },
      ],
    });
  };
  return { fetcher, calls };
}
test("bounded API discovery classifies rather than treating every result as a lead", async () => {
  const { fetcher, calls } = fixture();
  const report = await discoverHn(input, fetcher);
  assert.equal(calls.length, 2);
  assert.equal(report.scanned, 3);
  assert.equal(report.worthReviewing, 1);
  assert.equal(report.classifications.explicit_request, 1);
  assert.equal(report.classifications.irrelevant, 1);
  assert.equal(report.classifications.informational, 1);
  assert.equal(report.companies, 1);
  assert.equal(report.contactRoutes, 1);
  assert.equal(report.findings.find((f) => f.itemId === "12346")?.excerpt, "");
  assert.equal(
    report.findings.find((f) => f.itemId === "12346")?.contactRoute,
    null,
  );
});
test("save refresh accepts only original current buyer posts in dedicated threads", async () => {
  const { fetcher, calls } = fixture();
  const found = await refreshFinding("12345", input, fetcher);
  assert.equal(found.itemId, "12345");
  assert.equal(calls.length, 2);
  await assert.rejects(refreshFinding("../admin", input, fetcher));
  const seller: typeof fetch = async (url, init) =>
    String(url).includes("/items/12345")
      ? Response.json({
          id: 12345,
          type: "comment",
          parent_id: 999,
          text: "SEEKING WORK | CRM automation engineer",
          author: "synthetic-seller",
          created_at: new Date().toISOString(),
        })
      : fetcher(url, init);
  await assert.rejects(refreshFinding("12345", input, seller), /not a current/);
});
test("source failures and rate limits are honest errors, not fake empty successes", async () => {
  await assert.rejects(
    discoverHn(input, async () => new Response("", { status: 429 })),
    /rate limit/,
  );
  await assert.rejects(
    discoverHn(input, async () => {
      throw new TypeError("offline");
    }),
    /offline/,
  );
  await assert.rejects(
    hnJson(
      "items/1",
      AbortSignal.timeout(1000),
      async () =>
        new Response("html", { headers: { "content-type": "text/html" } }),
    ),
    /unsupported/,
  );
  await assert.rejects(
    hnJson("items/1", AbortSignal.timeout(1000), async () =>
      Response.json({ data: "x".repeat(2 * 1024 * 1024) }),
    ),
    /2 MiB/,
  );
});
test("zero matches returns an explicit business failure explanation and no fabricated contacts", async () => {
  const report = await discoverHn(input, async () =>
    Response.json({ nbHits: 0, nbPages: 0, hits: [] }),
  );
  assert.equal(report.scanned, 0);
  assert.equal(report.worthReviewing, 0);
  assert.deepEqual(report.findings, []);
  assert.match(report.explanation, /No current matching/);
});
