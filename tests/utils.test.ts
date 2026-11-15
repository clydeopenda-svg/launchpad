import assert from "node:assert/strict";
import { test } from "node:test";
import { clientIp, isRateLimited, rateLimit, retryAfterSeconds } from "@/lib/rateLimit";
import { likePattern } from "@/lib/db/queries";
import { cn, percent, readId, toCsv } from "@/lib/utils";

test("percent rounds to one decimal and handles zero totals", () => {
  assert.equal(percent(1, 3), 33.3);
  assert.equal(percent(2, 3), 66.7);
  assert.equal(percent(5, 0), 0);
});

test("cn skips falsy class names", () => {
  assert.equal(cn("a", false, null, undefined, "", "b"), "a b");
});

test("rateLimit allows up to the limit, then blocks until the window resets", (t) => {
  t.mock.timers.enable({ apis: ["Date"] });
  const key = "test-key";
  for (let i = 0; i < 3; i++) assert.equal(rateLimit(key, 3, 1000), true);
  assert.equal(rateLimit(key, 3, 1000), false);
  assert.equal(rateLimit("other-key", 3, 1000), true, "keys are limited independently");

  t.mock.timers.tick(1000);
  assert.equal(rateLimit(key, 3, 1000), true);
});

test("clientIp takes the first x-forwarded-for entry", () => {
  const request = new Request("http://localhost", { headers: { "x-forwarded-for": "203.0.113.5, 10.0.0.1" } });
  assert.equal(clientIp(request), "203.0.113.5");
  assert.equal(clientIp(new Request("http://localhost")), "unknown");
});

test("likePattern escapes LIKE wildcards in search input", () => {
  assert.equal(likePattern(" Ada "), "%Ada%");
  assert.equal(likePattern("50%_off\\"), "%50\\%\\_off\\\\%");
});

test("isRateLimited reports a used-up key without counting an attempt", () => {
  const key = "peek-key";
  assert.equal(isRateLimited(key, 2), false);
  rateLimit(key, 2, 60_000);
  assert.equal(isRateLimited(key, 2), false);
  rateLimit(key, 2, 60_000);
  assert.equal(isRateLimited(key, 2), true);
});

test("retryAfterSeconds reports the time left in the window, rounded up and at least 1", (t) => {
  t.mock.timers.enable({ apis: ["Date"] });
  const key = "retry-key";
  rateLimit(key, 1, 300_000);
  assert.equal(retryAfterSeconds(key), 300);

  t.mock.timers.tick(299_500);
  assert.equal(retryAfterSeconds(key), 1, "half a second left rounds up to 1");

  t.mock.timers.tick(10_000);
  assert.equal(retryAfterSeconds(key), 1, "an expired window never yields 0");
  assert.equal(retryAfterSeconds("unknown-key"), 1);
});

test("toCsv quotes every cell and neutralises spreadsheet formulas", () => {
  assert.equal(
    toCsv([
      ["Name", "Note"],
      ['Ada "The Countess"', "a, b\nc"],
      ["=HYPERLINK(1)", null],
    ]),
    '"Name","Note"\r\n"Ada ""The Countess""","a, b\nc"\r\n"\'=HYPERLINK(1)",""\r\n',
  );
});

test("readId accepts positive whole numbers and rejects values Number() would coerce", () => {
  assert.equal(readId(7), 7);
  // Number() would turn each of these into a usable-looking id (1, 0 or 5).
  for (const value of [true, false, null, "", "5", [5], 0, -3, 1.5, Number.NaN, Infinity, 2 ** 53, undefined]) {
    assert.equal(readId(value), null, `${JSON.stringify(value)} should be rejected`);
  }
});
