import assert from "node:assert/strict";
import { test } from "node:test";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { cn, percent } from "@/lib/utils";

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
