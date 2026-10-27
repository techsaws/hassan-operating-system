import { test } from "node:test";
import assert from "node:assert/strict";
import { qualifyLead } from "../src/features/leads/qualification";
const full = {
  targetService: "backend",
  problemEvidence: "Observed need",
  evidenceUrl: "https://example.com/evidence",
  serviceFitEvidence: "Recorded fit",
  contactName: "Test Contact",
  contactEmail: "test@example.com",
  contactRelevanceEvidence: "Recorded role",
  reachabilityEvidence: "Published email",
  buyingSignalEvidence: "Explicit request",
  buyingSignalUrl: "https://example.com/request",
};
test("missing information never scores positively", () => {
  assert.equal(qualifyLead({}).qualificationScore, 0);
  assert.equal(
    qualifyLead({
      targetService: "backend",
      contactName: "Contact",
      contactEmail: "a@example.com",
    }).qualificationScore,
    0,
  );
  assert.match(qualifyLead({}).qualificationExplanation, /missing/);
});
test("score is deterministic, bounded, and explains each criterion", () => {
  assert.deepEqual(qualifyLead(full), qualifyLead(full));
  assert.equal(qualifyLead(full).qualificationScore, 100);
  assert.equal(
    qualifyLead({ ...full, evidenceUrl: null }).qualificationScore,
    20,
  );
  assert.equal(
    qualifyLead({ ...full, buyingSignalUrl: null }).qualificationScore,
    80,
  );
  assert.equal(
    qualifyLead({ ...full, contactEmail: null }).qualificationScore,
    85,
  );
  assert.equal(
    qualifyLead({ ...full, problemEvidence: null }).qualificationScore,
    70,
  );
});
