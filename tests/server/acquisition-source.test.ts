import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fetchRemotive,
  assertRemotiveBudget,
} from "../../src/features/acquisition/remotive";
import { syntheticJob } from "../fixtures/acquisition";
test("remote source uses only its fixed public API, rejects HTTP/type/schema failures and never follows redirects", async () => {
  let calls = 0;
  const good: typeof fetch = async (url, init) => {
    calls++;
    assert.equal(
      String(url),
      "https://remotive.com/api/remote-jobs?category=software-dev",
    );
    assert.equal(init?.redirect, "error");
    assert.equal(init?.cache, "no-store");
    return Response.json({ jobs: [syntheticJob] });
  };
  assert.equal((await fetchRemotive(good)).jobs.length, 1);
  assert.equal(calls, 1);
  await assert.rejects(
    fetchRemotive(async () => new Response("Forbidden", { status: 403 })),
    /HTTP 403/,
  );
  await assert.rejects(
    fetchRemotive(
      async () =>
        new Response("HTML", { headers: { "content-type": "text/html" } }),
    ),
    /content type/,
  );
  await assert.rejects(
    fetchRemotive(async () => Response.json({ jobs: [{ id: "fake" }] })),
  );
});
test("oversized or unavailable feeds fail honestly instead of fabricating zero matches", async () => {
  await assert.rejects(
    fetchRemotive(
      async () =>
        new Response("x".repeat(12 * 1024 * 1024 + 1), {
          headers: { "content-type": "application/json" },
        }),
    ),
    /12 MiB/,
  );
  await assert.rejects(
    fetchRemotive(async () => {
      throw new Error("offline");
    }),
    /offline/,
  );
});
test("rolling source budgets include failed attempts, expire after a day and prohibit immediate retries", () => {
  const now = Date.now();
  assert.throws(
    () => assertRemotiveBudget([new Date(now - 1000)], now),
    /minute/,
  );
  assert.throws(
    () =>
      assertRemotiveBudget(
        [1, 2, 3, 4].map((h) => new Date(now - h * 3600000)),
        now,
      ),
    /daily request budget/,
  );
  assert.doesNotThrow(() =>
    assertRemotiveBudget(
      [1, 2, 3, 4].map((h) => new Date(now - 86400000 - h * 3600000)),
      now,
    ),
  );
});
