import assert from "node:assert/strict";
import { before, beforeEach, test } from "node:test";
import type { Client } from "@libsql/client";

// These tests run the real SQL in src/lib/db/queries.ts against a throwaway
// in-memory SQLite database, so the duplicate-protection rules that live in
// the database (UNIQUE votes, "checked_in_at IS NULL") are exercised too.
//
// getDb() reads TURSO_DATABASE_URL the first time it is called, so the URL is
// set here and the modules are imported afterwards (dynamic import below).
// This also guarantees the tests can never touch launchpad.db or a real Turso
// database, even if those variables are set in the shell.
process.env.TURSO_DATABASE_URL = ":memory:";
delete process.env.TURSO_AUTH_TOKEN;

let db: Client;
let q: typeof import("@/lib/db/queries");

before(async () => {
  const { getDb } = await import("@/lib/db/client");
  q = await import("@/lib/db/queries");
  db = getDb();
});

// Fresh tables and a small fixed data set before every test:
//   guest 1 (CODE-IN)  checked in       guest 2 (CODE-OUT) not checked in
//   poll 1 open: options 1, 2           poll 2 closed: option 3
beforeEach(async () => {
  const { dropStatements, schemaStatements } = await import("@/lib/db/schema");
  await db.batch([...dropStatements, ...schemaStatements], "write");
  await db.batch(
    [
      `INSERT INTO guests (id, full_name, email, organization, ticket_type, checkin_code, checked_in_at)
       VALUES (1, 'Ada Lovelace', 'ada@example.com', 'Analytical', 'VIP', 'CODE-IN', '2026-11-14T09:00:00.000Z')`,
      `INSERT INTO guests (id, full_name, email, organization, ticket_type, checkin_code, checked_in_at)
       VALUES (2, 'Alan Turing', 'alan@example.com', 'Bletchley', 'General', 'CODE-OUT', NULL)`,
      `INSERT INTO polls (id, question, status, show_results) VALUES (1, 'Best talk?', 'open', 1)`,
      `INSERT INTO polls (id, question, status, show_results) VALUES (2, 'Best venue?', 'closed', 1)`,
      `INSERT INTO poll_options (id, poll_id, label, position) VALUES (1, 1, 'Keynote', 0)`,
      `INSERT INTO poll_options (id, poll_id, label, position) VALUES (2, 1, 'Panel', 1)`,
      `INSERT INTO poll_options (id, poll_id, label, position) VALUES (3, 2, 'Main hall', 0)`,
    ],
    "write",
  );
});

test("castVote records one vote per guest per poll", async () => {
  assert.deepEqual(await q.castVote("CODE-IN", 1, 1), { status: "voted" });
  // A second vote, even for a different option, is rejected by the UNIQUE rule.
  assert.deepEqual(await q.castVote("CODE-IN", 1, 2), { status: "already_voted" });

  const [poll] = await q.getPolls();
  assert.equal(poll.totalVotes, 1);
  assert.deepEqual(await q.getVotesForGuest(1), { 1: 1 });
});

test("castVote matches check-in codes case-insensitively and ignores surrounding spaces", async () => {
  assert.deepEqual(await q.castVote("  code-in ", 1, 2), { status: "voted" });
});

test("castVote rejects unknown codes and guests who haven't checked in", async () => {
  assert.deepEqual(await q.castVote("NOPE", 1, 1), { status: "guest_not_found" });
  assert.deepEqual(await q.castVote("CODE-OUT", 1, 1), { status: "not_checked_in" });
});

test("castVote rejects closed polls and options from another poll", async () => {
  assert.deepEqual(await q.castVote("CODE-IN", 2, 3), { status: "poll_closed" });
  // Option 3 exists but belongs to poll 2, so it can't be used to vote in poll 1.
  assert.deepEqual(await q.castVote("CODE-IN", 1, 3), { status: "invalid_option" });
  assert.equal(await q.countDistinctVoters(), 0);
});

test("checkInGuest checks a guest in once and reports repeats", async () => {
  const first = await q.checkInGuest(2);
  assert.equal(first.status, "checked_in");
  const arrivedAt = first.status === "checked_in" ? first.guest.checkedInAt : null;
  assert.ok(arrivedAt);

  // A second usher scanning the same guest must not overwrite the arrival time.
  const second = await q.checkInGuest(2);
  assert.equal(second.status, "already_checked_in");
  assert.equal(second.status === "already_checked_in" && second.guest.checkedInAt, arrivedAt);

  assert.deepEqual(await q.checkInGuest(999), { status: "not_found" });
  assert.equal((await q.getAttendanceStats()).checkedIn, 2);
});

test("updatePoll changes only the given fields and reports missing polls", async () => {
  assert.equal(await q.updatePoll(1, { showResults: false }), true);
  let [poll] = await q.getPolls();
  assert.equal(poll.status, "open", "status is left alone");
  assert.equal(poll.showResults, false);

  assert.equal(await q.updatePoll(1, { status: "closed" }), true);
  [poll] = await q.getPolls();
  assert.equal(poll.status, "closed");
  assert.equal(poll.showResults, false, "showResults is left alone");

  assert.equal(await q.updatePoll(999, { status: "open" }), false);
});

test("searchGuests treats % and _ literally and reports the full match count", async () => {
  assert.equal((await q.searchGuests("%")).total, 0);
  assert.equal((await q.searchGuests("_")).total, 0);
  const { guests, total } = await q.searchGuests("", 1);
  assert.equal(total, 2);
  assert.equal(guests.length, 1, "limit caps the rows returned");
});
