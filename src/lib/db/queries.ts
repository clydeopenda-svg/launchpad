import type { Row } from "@libsql/client";
import { getDb } from "./client";
import { percent } from "@/lib/utils";
import type { AttendanceStats, Guest, Poll, TicketType } from "@/types";

// All SQL used by the app lives here, so API routes stay short and readable.
// Every query uses "?" placeholders — never string concatenation — which
// protects against SQL injection.

function toGuest(row: Row): Guest {
  return {
    id: Number(row.id),
    fullName: String(row.full_name),
    email: String(row.email),
    organization: String(row.organization),
    ticketType: row.ticket_type as TicketType,
    checkinCode: String(row.checkin_code),
    checkedInAt: row.checked_in_at === null ? null : String(row.checked_in_at),
  };
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

// ---------- Guests & check-in ----------

/**
 * Turns user input into a LIKE "contains" pattern. % and _ are LIKE
 * wildcards, so they are escaped (paired with ESCAPE '\' in the SQL):
 * otherwise searching for "_" would match every guest.
 */
export function likePattern(search: string): string {
  return `%${search.trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/**
 * Search by name, organization or check-in code. Empty search returns everyone.
 * Only the first `limit` rows are fetched; `total` is the full match count, so
 * the usher screen can say "showing 50 of 200" without loading every guest.
 */
export async function searchGuests(search = "", limit = 50): Promise<{ guests: Guest[]; total: number }> {
  const term = likePattern(search);
  const where = `full_name LIKE ? ESCAPE '\\' OR organization LIKE ? ESCAPE '\\' OR checkin_code LIKE ? ESCAPE '\\'`;
  const db = getDb();
  const [rows, count] = await Promise.all([
    db.execute({
      sql: `SELECT * FROM guests WHERE ${where} ORDER BY full_name LIMIT ?`,
      args: [term, term, term, limit],
    }),
    db.execute({ sql: `SELECT COUNT(*) AS total FROM guests WHERE ${where}`, args: [term, term, term] }),
  ]);
  return { guests: rows.rows.map(toGuest), total: Number(count.rows[0].total) };
}

/** Every guest, by name. For the organizer's CSV export. */
export async function getAllGuests(): Promise<Guest[]> {
  const result = await getDb().execute("SELECT * FROM guests ORDER BY full_name");
  return result.rows.map(toGuest);
}

export async function getGuestById(id: number): Promise<Guest | null> {
  const result = await getDb().execute({ sql: "SELECT * FROM guests WHERE id = ?", args: [id] });
  return result.rows[0] ? toGuest(result.rows[0]) : null;
}

export async function getGuestByCode(code: string): Promise<Guest | null> {
  const result = await getDb().execute({
    sql: "SELECT * FROM guests WHERE checkin_code = ?",
    args: [normalizeCode(code)],
  });
  return result.rows[0] ? toGuest(result.rows[0]) : null;
}

export type CheckInResult =
  | { status: "checked_in"; guest: Guest }
  | { status: "already_checked_in"; guest: Guest }
  | { status: "not_found" };

/**
 * Checks a guest in. The "AND checked_in_at IS NULL" condition makes this
 * safe against duplicates: if the guest is already checked in (even by
 * another usher a split second earlier), no row is updated.
 */
export async function checkInGuest(id: number): Promise<CheckInResult> {
  const update = await getDb().execute({
    sql: "UPDATE guests SET checked_in_at = ? WHERE id = ? AND checked_in_at IS NULL",
    args: [new Date().toISOString(), id],
  });

  const guest = await getGuestById(id);
  if (!guest) return { status: "not_found" };
  return update.rowsAffected === 1
    ? { status: "checked_in", guest }
    : { status: "already_checked_in", guest };
}

export async function getAttendanceStats(): Promise<AttendanceStats> {
  const result = await getDb().execute(
    `SELECT COUNT(*) AS total, COUNT(checked_in_at) AS checked_in FROM guests`,
  );
  const totalGuests = Number(result.rows[0].total);
  const checkedIn = Number(result.rows[0].checked_in);
  return {
    totalGuests,
    checkedIn,
    notCheckedIn: totalGuests - checkedIn,
    attendancePercent: percent(checkedIn, totalGuests),
  };
}

// ---------- Polls & votes ----------

/** All polls with their options and live vote counts. */
export async function getPolls(): Promise<Poll[]> {
  const db = getDb();
  const [pollRows, optionRows] = await Promise.all([
    db.execute("SELECT * FROM polls ORDER BY id"),
    db.execute(`SELECT o.id, o.poll_id, o.label, COUNT(v.id) AS votes
                FROM poll_options o
                LEFT JOIN votes v ON v.option_id = o.id
                GROUP BY o.id
                ORDER BY o.poll_id, o.position`),
  ]);

  return pollRows.rows.map((row) => {
    const options = optionRows.rows
      .filter((o) => Number(o.poll_id) === Number(row.id))
      .map((o) => ({ id: Number(o.id), label: String(o.label), votes: Number(o.votes) }));
    return {
      id: Number(row.id),
      question: String(row.question),
      status: row.status as Poll["status"],
      showResults: Number(row.show_results) === 1,
      options,
      totalVotes: options.reduce((sum, o) => sum + o.votes, 0),
    };
  });
}

/** Map of pollId -> optionId for the polls this guest has already voted in. */
export async function getVotesForGuest(guestId: number): Promise<Record<number, number>> {
  const result = await getDb().execute({
    sql: "SELECT poll_id, option_id FROM votes WHERE guest_id = ?",
    args: [guestId],
  });
  return Object.fromEntries(result.rows.map((r) => [Number(r.poll_id), Number(r.option_id)]));
}

/** Number of different guests who have voted in at least one poll. */
export async function countDistinctVoters(): Promise<number> {
  const result = await getDb().execute("SELECT COUNT(DISTINCT guest_id) AS voters FROM votes");
  return Number(result.rows[0].voters);
}

export type VoteResult =
  | { status: "voted" }
  | { status: "already_voted" }
  | { status: "guest_not_found" }
  | { status: "not_checked_in" }
  | { status: "poll_closed" }
  | { status: "invalid_option" };

export async function castVote(code: string, pollId: number, optionId: number): Promise<VoteResult> {
  const guest = await getGuestByCode(code);
  if (!guest) return { status: "guest_not_found" };
  if (!guest.checkedInAt) return { status: "not_checked_in" };

  const db = getDb();
  const option = await db.execute({
    sql: `SELECT p.status FROM poll_options o JOIN polls p ON p.id = o.poll_id
          WHERE o.id = ? AND o.poll_id = ?`,
    args: [optionId, pollId],
  });
  if (!option.rows[0]) return { status: "invalid_option" };
  if (option.rows[0].status !== "open") return { status: "poll_closed" };

  try {
    await db.execute({
      sql: "INSERT INTO votes (poll_id, option_id, guest_id, created_at) VALUES (?, ?, ?, ?)",
      args: [pollId, optionId, guest.id, new Date().toISOString()],
    });
    return { status: "voted" };
  } catch (error) {
    // The UNIQUE (poll_id, guest_id) rule rejected a second vote.
    if (String(error).includes("UNIQUE")) return { status: "already_voted" };
    throw error;
  }
}

// ---------- Organizer ----------

/** The most recent check-ins, newest first. */
export async function getRecentCheckIns(limit = 10): Promise<Guest[]> {
  const result = await getDb().execute({
    sql: `SELECT * FROM guests WHERE checked_in_at IS NOT NULL
          ORDER BY checked_in_at DESC LIMIT ?`,
    args: [limit],
  });
  return result.rows.map(toGuest);
}

/**
 * Opens/closes a poll and/or shows/hides its results to attendees.
 * Returns false if the poll doesn't exist. Only the fields given are changed.
 */
export async function updatePoll(
  id: number,
  changes: { status?: Poll["status"]; showResults?: boolean },
): Promise<boolean> {
  const sets: string[] = [];
  const args: (string | number)[] = [];
  // Column names are fixed strings here, never user input; values still go
  // through "?" placeholders.
  if (changes.status !== undefined) {
    sets.push("status = ?");
    args.push(changes.status);
  }
  if (changes.showResults !== undefined) {
    sets.push("show_results = ?");
    args.push(changes.showResults ? 1 : 0);
  }
  if (sets.length === 0) return true;

  const result = await getDb().execute({
    sql: `UPDATE polls SET ${sets.join(", ")} WHERE id = ?`,
    args: [...args, id],
  });
  return result.rowsAffected === 1;
}
