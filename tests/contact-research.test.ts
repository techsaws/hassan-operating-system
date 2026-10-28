import { test } from "node:test";
import assert from "node:assert/strict";
import {
  blankAnnotation,
  validateAnnotation,
  usableRoute,
  contactStatus,
  type ContactSource,
} from "../src/features/opportunities/contact-types";
const source: ContactSource = {
  id: crypto.randomUUID(),
  url: "https://example.com/contact",
  origin: "operator",
  recordedAt: new Date().toISOString(),
  excerpt:
    "Test Owner runs the business. Vendor inquiries: vendor@example.com. Customer bookings use our service form. Staff call after requests arrive.",
  annotation: { ...blankAnnotation },
};
test("contact research requires published names, routes and literal source evidence; no email guessing", () => {
  assert.throws(
    () =>
      validateAnnotation(
        {
          ...blankAnnotation,
          name: "Invented Person",
          roleQuote: "Test Owner runs the business.",
        },
        source,
      ),
    /Published contact name/,
  );
  assert.throws(
    () =>
      validateAnnotation(
        {
          ...blankAnnotation,
          routeKind: "email",
          route: "owner@example.com",
          routeQuote: "Vendor inquiries: vendor@example.com.",
        },
        source,
      ),
    /never guess/,
  );
  assert.throws(
    () =>
      validateAnnotation(
        { ...blankAnnotation, workflowQuote: "They lose customers." },
        source,
      ),
    /verbatim/,
  );
  const a = validateAnnotation(
    {
      ...blankAnnotation,
      name: "Test Owner",
      role: "Owner (operator interpretation)",
      roleQuote: "Test Owner runs the business.",
      routeKind: "email",
      route: "vendor@example.com",
      routeQuote: "Vendor inquiries: vendor@example.com.",
      routePurpose: "b2b_explicit",
      reviewed: true,
    },
    source,
  );
  assert.equal(usableRoute(a), true);
  assert.equal(usableRoute({ ...a, reviewed: false }), false);
  assert.equal(usableRoute({ ...a, routePurpose: "unknown" }), false);
  assert.equal(usableRoute({ ...a, routeKind: "customer_booking" }), false);
  assert.equal(usableRoute({ ...a, routePurpose: "customer_only" }), false);
  assert.throws(
    () =>
      validateAnnotation(
        { ...a, routeKind: "public_page", route: "javascript:alert(1)" },
        { ...source, excerpt: source.excerpt + " javascript:alert(1)" },
      ),
    /HTTP/,
  );
});
test("workflow observations/inferences never become confirmed problems or an outreach route by default", () => {
  const a = validateAnnotation(
    {
      ...blankAnnotation,
      workflowQuote: "Staff call after requests arrive.",
      automationQuestion: "Could intake handoffs be worth discussing?",
      reviewed: true,
    },
    source,
  );
  assert.equal(a.problemConfirmed, false);
  assert.equal(a.problemQuote, "");
  assert.equal(usableRoute(a), false);
  assert.equal(
    contactStatus({ sources: [{ ...source, annotation: a }] }),
    "Contact research needed",
  );
  assert.throws(
    () =>
      validateAnnotation(
        { ...a, problemQuote: "Staff call after requests arrive." },
        source,
      ),
    /Confirm that/,
  );
  assert.throws(
    () => validateAnnotation({ ...a, problemConfirmed: true }, source),
    /requires original evidence/,
  );
});
