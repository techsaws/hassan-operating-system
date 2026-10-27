import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyComment,
  availability,
  plainPost,
} from "../src/features/discovery/classify";
import { manualSearches } from "../src/features/discovery/manual-search";
import type { DiscoveryInput } from "../src/features/discovery/types";
const input: DiscoveryInput = {
  campaignId: crypto.randomUUID(),
  targetService: "automation",
  country: "United States",
  buyerCategory: "small_business",
  keywords: "",
  includeUnknown: true,
};
const post = {
  id: "12345",
  parentId: "999",
  publishedAt: "2026-10-25T12:00:00Z",
  author: "synthetic-buyer",
  html: "SEEKING FREELANCER | Remote<p>Company: Synthetic Test Company</p><p>Company country: United States</p><p>Company type: small business</p><p>We need a paid developer to automate scheduling and CRM integration.</p><p>Email: test@example.com</p>",
};
test("separates actual buyer requests from sellers, discussions and open-source issues", () => {
  const buyer = classifyComment(post, "999", input, "2026-10-28");
  assert.equal(buyer.classification, "explicit_request");
  assert.equal(buyer.saveable, true);
  assert.equal(buyer.companyName, "Synthetic Test Company");
  assert.equal(buyer.contactEmail, "test@example.com");
  for (const html of [
    "SEEKING WORK | USA | CRM automation developer for hire",
    "SEEKING FREELANCE / CONTRACT | software automation developer",
    "SEEKING FREELANCER | No freelancers, employees only, CRM developer",
  ]) {
    const seller = classifyComment(
      { ...post, html },
      "999",
      input,
      "2026-10-28",
    );
    assert.equal(seller.classification, "irrelevant");
    assert.equal(seller.saveable, false);
    assert.equal(seller.contactEmail, null);
  }
  assert.equal(
    classifyComment({ ...post, parentId: "111" }, "999", input, "2026-10-28")
      .classification,
    "informational",
  );
  assert.equal(
    classifyComment(
      {
        ...post,
        html: "How do I automate CRM? Here is a GitHub issue needing volunteers.",
      },
      "999",
      input,
      "2026-10-28",
    ).saveable,
    false,
  );
  const uncertain = classifyComment(
    {
      ...post,
      html: "SEEKING FREELANCER | Need an API developer for an open-source automation project.",
    },
    "999",
    input,
    "2026-10-28",
  );
  assert.equal(uncertain.classification, "uncertain_opportunity");
  assert.equal(
    classifyComment(
      { ...post, html: post.html + "<p>Unpaid, no budget.</p>" },
      "999",
      input,
      "2026-10-28",
    ).saveable,
    false,
  );
});
test("does not invent companies, country, business size, emails or paid budgets", () => {
  const found = classifyComment(
    {
      ...post,
      html: "SEEKING FREELANCER | US time-zone overlap needed<p>Looking for CRM automation help for customers who run small businesses.</p>",
    },
    "999",
    input,
    "2026-10-28",
  );
  assert.equal(found.companyName, null);
  assert.equal(found.countryEvidence, null);
  assert.equal(found.categoryEvidence, null);
  assert.equal(found.contactRoute, null);
  assert.equal(found.contactEmail, null);
  assert.ok(found.missing.includes("Paid budget / scope not verified"));
  assert.equal(
    found.saveable,
    true,
    "unknowns are visible review candidates only when opted in",
  );
  assert.equal(
    classifyComment(
      { ...post, html: found.excerpt },
      "999",
      { ...input, includeUnknown: false },
      "2026-10-28",
    ).saveable,
    false,
  );
  assert.equal(
    classifyComment(
      { ...post, html: post.html.replace("United States", "Canada") },
      "999",
      input,
      "2026-10-28",
    ).matches,
    false,
  );
});
test("marks closed, expired and stale results; never treats a recent date as proof of availability", () => {
  assert.equal(
    availability("[CLOSED] request", post.publishedAt, "2026-10-28"),
    "closed",
  );
  assert.equal(
    availability("Position filled", post.publishedAt, "2026-10-28"),
    "closed",
  );
  assert.equal(
    availability("Apply by: 2026-10-20", post.publishedAt, "2026-10-28"),
    "expired",
  );
  assert.equal(
    availability("Deadline: unknown", "2026-08-01T12:00:00Z", "2026-10-28"),
    "stale",
  );
  assert.equal(
    classifyComment(post, "999", input, "2026-10-28").availability,
    "current_unconfirmed",
  );
  assert.equal(
    classifyComment(
      { ...post, html: post.html + "[CLOSED]" },
      "999",
      input,
      "2026-10-28",
    ).saveable,
    false,
  );
});
test("manual search links need no company and remain browser-only; source HTML is plain text", () => {
  assert.ok(
    manualSearches(input).every((link) =>
      link.url.startsWith("https://www.google.com/search?q="),
    ),
  );
  assert.ok(
    manualSearches({
      ...input,
      keywords: "appointment booking",
    })[0].query.includes("appointment booking"),
  );
  assert.equal(
    plainPost(
      "<p>Need CRM integration</p><script>steal credentials</script>",
    ).includes("steal"),
    false,
  );
});
