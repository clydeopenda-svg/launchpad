import assert from "node:assert/strict";
import { test } from "node:test";
import { toAttendeePoll } from "@/lib/attendee";
import type { Poll } from "@/types";

function poll(overrides: Partial<Poll> = {}): Poll {
  return {
    id: 1,
    question: "Best talk?",
    status: "open",
    showResults: true,
    options: [
      { id: 10, label: "Keynote", votes: 7 },
      { id: 11, label: "Panel", votes: 3 },
    ],
    totalVotes: 10,
    ...overrides,
  };
}

test("hides results from a guest who hasn't voted on an open poll", () => {
  const result = toAttendeePoll(poll(), null);
  assert.equal(result.resultsVisible, false);
  assert.equal(result.totalVotes, undefined);
  // Counts must be absent from the payload, not just hidden in the UI.
  for (const option of result.options) assert.equal("votes" in option, false);
});

test("shows results once the guest has voted", () => {
  const result = toAttendeePoll(poll(), 10);
  assert.equal(result.resultsVisible, true);
  assert.equal(result.totalVotes, 10);
  assert.equal(result.myOptionId, 10);
});

test("shows results to everyone when the poll is closed", () => {
  assert.equal(toAttendeePoll(poll({ status: "closed" }), null).resultsVisible, true);
});

test("never sends counts while the organizer keeps results hidden", () => {
  const result = toAttendeePoll(poll({ status: "closed", showResults: false }), 10);
  assert.equal(result.resultsVisible, false);
  assert.equal(result.totalVotes, undefined);
  for (const option of result.options) assert.equal("votes" in option, false);
});
