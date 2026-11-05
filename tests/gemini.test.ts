import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { GeminiError, generateReply } from "@/lib/gemini";

// generateReply talks to Google over fetch, so these tests replace fetch with
// canned responses. That checks how each kind of Gemini reply is mapped to an
// answer or a GeminiError, without a key or network access.

const realFetch = globalThis.fetch;
let lastRequest: { url: string; init: RequestInit } | undefined;

function mockFetch(status: number, body: unknown) {
  globalThis.fetch = async (url, init) => {
    lastRequest = { url: String(url), init: init ?? {} };
    return new Response(JSON.stringify(body), { status });
  };
}

async function errorKind(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    assert.ok(error instanceof GeminiError, `expected GeminiError, got ${error}`);
    return error.kind;
  }
  assert.fail("expected generateReply to throw");
}

const question = [{ role: "user" as const, content: "When is lunch?" }];

beforeEach(() => {
  process.env.GEMINI_API_KEY = "test-key";
  delete process.env.GEMINI_MODEL;
  lastRequest = undefined;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

test("returns the answer text, skipping thought parts", async () => {
  mockFetch(200, {
    candidates: [{ content: { parts: [{ text: "thinking…", thought: true }, { text: "Lunch is at " }, { text: "12:30." }] } }],
  });
  assert.equal(await generateReply("system", question), "Lunch is at 12:30.");
});

test("sends the key in a header and maps assistant turns to Gemini's model role", async () => {
  mockFetch(200, { candidates: [{ content: { parts: [{ text: "ok" }] } }] });
  await generateReply("system", [...question, { role: "assistant", content: "12:30" }, { role: "user", content: "Where?" }]);

  assert.ok(lastRequest);
  assert.ok(!lastRequest.url.includes("test-key"), "the key must not appear in the URL");
  assert.ok(lastRequest.url.includes("gemini-3.5-flash-lite"));
  assert.equal(new Headers(lastRequest.init.headers).get("x-goog-api-key"), "test-key");
  const body = JSON.parse(String(lastRequest.init.body));
  assert.deepEqual(
    body.contents.map((c: { role: string }) => c.role),
    ["user", "model", "user"],
  );
});

test("fails as not_configured without an API key, before calling Gemini", async () => {
  process.env.GEMINI_API_KEY = " ";
  mockFetch(200, {});
  assert.equal(await errorKind(generateReply("system", question)), "not_configured");
  assert.equal(lastRequest, undefined);
});

test("maps HTTP errors to friendly error kinds", async () => {
  mockFetch(429, { error: { message: "Quota exceeded" } });
  assert.equal(await errorKind(generateReply("system", question)), "rate_limited");

  mockFetch(400, { error: { message: "API key not valid. Please pass a valid API key." } });
  assert.equal(await errorKind(generateReply("system", question)), "auth");

  mockFetch(500, { error: { message: "Internal error" } });
  assert.equal(await errorKind(generateReply("system", question)), "failed");
});

test("treats blocked prompts and safety stops as blocked", async () => {
  mockFetch(200, { promptFeedback: { blockReason: "SAFETY" } });
  assert.equal(await errorKind(generateReply("system", question)), "blocked");

  mockFetch(200, { candidates: [{ finishReason: "SAFETY" }] });
  assert.equal(await errorKind(generateReply("system", question)), "blocked");
});

test("treats an empty reply as failed", async () => {
  mockFetch(200, { candidates: [{ content: { parts: [] }, finishReason: "MAX_TOKENS" }] });
  assert.equal(await errorKind(generateReply("system", question)), "failed");
});

test("reports a network failure as failed", async () => {
  globalThis.fetch = async () => {
    throw new TypeError("fetch failed");
  };
  assert.equal(await errorKind(generateReply("system", question)), "failed");
});
