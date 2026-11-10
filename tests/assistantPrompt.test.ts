import assert from "node:assert/strict";
import { test } from "node:test";
import { buildAssistantPrompt } from "@/lib/assistantPrompt";
import { eventInfo } from "@/data/event";
import type { AttendanceStats, Poll } from "@/types";

const stats: AttendanceStats = { totalGuests: 120, checkedIn: 45, notCheckedIn: 75, attendancePercent: 37.5 };

function poll(overrides: Partial<Poll>): Poll {
  return {
    id: 1,
    question: "Which track next?",
    status: "open",
    showResults: true,
    options: [
      { id: 1, label: "Design", votes: 3 },
      { id: 2, label: "Data", votes: 1 },
    ],
    totalVotes: 4,
    ...overrides,
  };
}

// The README promises the assistant can't reveal results the organizer has
// hidden. This is the test that keeps that promise.
test("hidden poll results never reach the prompt", () => {
  const prompt = buildAssistantPrompt(
    [poll({ showResults: false, options: [{ id: 1, label: "Secret option", votes: 987 }], totalVotes: 987 })],
    stats
  );
  assert.match(prompt, /"Which track next\?"/);
  assert.match(prompt, /not yet announced by the organizers/);
  assert.doesNotMatch(prompt, /987/);
  assert.doesNotMatch(prompt, /Secret option/);
});

test("visible results are shown as rounded percentages with the vote total", () => {
  const prompt = buildAssistantPrompt([poll({})], stats);
  assert.match(prompt, /Results \(4 votes\): Design 75%, Data 25%/);
});

test("a visible poll with no votes says so instead of dividing by zero", () => {
  const prompt = buildAssistantPrompt([poll({ totalVotes: 0, options: [{ id: 1, label: "Design", votes: 0 }] })], stats);
  assert.match(prompt, /Results: no votes yet\./);
  assert.doesNotMatch(prompt, /NaN/);
});

test("poll status and the empty-poll fallback are described", () => {
  assert.match(buildAssistantPrompt([poll({ status: "closed" })], stats), /\(closed\)/);
  assert.match(buildAssistantPrompt([], stats), /- No polls yet\./);
});

test("the prompt carries live attendance and the event details", () => {
  const prompt = buildAssistantPrompt([], stats);
  assert.match(prompt, /45 of 120 registered guests have checked in/);
  assert.ok(prompt.includes(eventInfo.name));
  assert.ok(prompt.includes(eventInfo.venue));
});
