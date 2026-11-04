import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { createStaffToken, isValidStaffToken } from "@/lib/auth/staff";
import { safeNextPath } from "@/lib/auth/safeNextPath";

beforeEach(() => {
  process.env.STAFF_PIN = "135790";
});

test("issues a token for the correct PIN and accepts it", async () => {
  const token = await createStaffToken("135790");
  assert.ok(token);
  assert.equal(await isValidStaffToken(token), true);
});

test("trims whitespace around a typed PIN", async () => {
  assert.ok(await createStaffToken(" 135790 "));
});

test("rejects a wrong PIN and a forged token", async () => {
  assert.equal(await createStaffToken("000000"), null);
  assert.equal(await isValidStaffToken("not-a-real-token"), false);
  assert.equal(await isValidStaffToken(undefined), false);
});

test("changing STAFF_PIN invalidates existing tokens", async () => {
  const token = await createStaffToken("135790");
  process.env.STAFF_PIN = "246801";
  assert.equal(await isValidStaffToken(token ?? undefined), false);
});

test("fails closed when no PIN is configured", async () => {
  process.env.STAFF_PIN = "  ";
  assert.equal(await createStaffToken(""), null);
  assert.equal(await isValidStaffToken(""), false);
});

test("safeNextPath only allows same-site paths", () => {
  assert.equal(safeNextPath("/organizer?tab=polls"), "/organizer?tab=polls");
  assert.equal(safeNextPath("//evil.com"), "/usher");
  assert.equal(safeNextPath("/\\evil.com"), "/usher");
  assert.equal(safeNextPath("https://evil.com"), "/usher");
  assert.equal(safeNextPath(null, "/organizer"), "/organizer");
});
