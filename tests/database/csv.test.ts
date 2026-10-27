import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseCsv,
  prepareCsv,
  suggestMapping,
} from "../../src/features/leads/csv";

test("CSV handles BOM, quoted commas, escaped quotes, multiline notes, and header aliases", () => {
  const csv =
    '\uFEFFBusiness Name,Email Address,Website,Service,Comments\r\n"Acme, Inc",PERSON@example.com,https://example.com,BACKEND,"A ""quoted"" note\nnext line"';
  const { headers } = parseCsv(csv);
  const plan = prepareCsv(csv, suggestMapping(headers));
  assert.equal(plan.candidates.length, 1);
  assert.equal(plan.candidates[0].data.companyName, "Acme, Inc");
  assert.equal(plan.candidates[0].data.contactEmail, "person@example.com");
  assert.equal(plan.candidates[0].data.serviceInterest, "backend");
  assert.equal(plan.candidates[0].data.notes, 'A "quoted" note\nnext line');
});
test("invalid rows are reported, case-insensitive duplicates skipped, blank emails retained", () => {
  const csv =
    "Company,Email\nGood,a@example.com\nDuplicate,A@EXAMPLE.COM\nInvalid,bad\n,empty@example.com\nBlank1,\nBlank2,\nWrong,width,extra";
  const plan = prepareCsv(csv, suggestMapping(parseCsv(csv).headers));
  assert.equal(plan.total, 7);
  assert.equal(plan.invalid, 3);
  assert.equal(plan.duplicates, 1);
  assert.equal(plan.candidates.length, 3);
  assert.equal(plan.candidates.filter((c) => !c.data.contactEmail).length, 2);
});
test("rejects malformed CSV, oversized files, too many rows and invalid mappings", () => {
  assert.throws(() => parseCsv('Company\n"unfinished'));
  assert.throws(() => parseCsv("x".repeat(1024 * 1024 + 1)), /1 MiB/);
  assert.throws(() => parseCsv("Company\n" + "A\n".repeat(1001)), /1000/);
  assert.throws(() => parseCsv("Company\n"), /at least one/);
  assert.throws(() => prepareCsv("Company\nA", {}));
  const mapping = suggestMapping(["Company", "Email"]);
  assert.throws(
    () =>
      prepareCsv("Company,Email\nA,a@example.com", {
        ...mapping,
        contactEmail: 0,
      }),
    /only one/,
  );
});
