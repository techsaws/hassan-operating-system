import { test } from "node:test";
import assert from "node:assert/strict";
import { leadInput } from "../src/features/leads/validation";

const valid = {
  companyName: "  Acme  ",
  websiteUrl: "",
  contactName: "",
  contactEmail: "",
  country: "",
  source: "",
  serviceInterest: "",
  status: "new",
  notes: "",
  nextFollowUp: "",
};
test("normalizes whitespace, optional fields and email casing", () => {
  const result = leadInput.parse({
    ...valid,
    contactEmail: "  Person@Example.com  ",
  });
  assert.equal(result.companyName, "Acme");
  assert.equal(result.contactEmail, "person@example.com");
  assert.equal(result.websiteUrl, null);
  assert.equal(result.nextFollowUp, null);
});
test("rejects empty company, malformed email, unsafe URL, invalid enums and impossible dates", () => {
  for (const change of [
    { companyName: " " },
    { contactEmail: "bad" },
    { websiteUrl: "javascript:alert(1)" },
    { websiteUrl: "https://" },
    { status: "unknown" },
    { serviceInterest: "unknown" },
    { nextFollowUp: "2026-02-30" },
    { companyName: "a".repeat(201) },
  ]) {
    assert.equal(
      leadInput.safeParse({ ...valid, ...change }).success,
      false,
      JSON.stringify(change),
    );
  }
});
test("accepts every pipeline status and valid dates and web URLs", () => {
  for (const status of [
    "new",
    "researching",
    "qualified",
    "contacted",
    "replied",
    "meeting",
    "proposal",
    "won",
    "lost",
  ]) {
    assert.equal(
      leadInput.safeParse({
        ...valid,
        status,
        nextFollowUp: "2028-02-29",
        websiteUrl: "https://example.com",
      }).success,
      true,
    );
  }
});
