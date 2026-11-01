// Resets the database and fills it with dummy data.
//
//   npm run db:seed          -> 200 guests, sample polls, nobody checked in
//   npm run db:seed -- --demo -> same, plus some check-ins and votes so the
//                               dashboards have data to show straight away
//
// WARNING: this deletes all existing guests, check-ins and votes.

import { getDb } from "@/lib/db/client";
import { dropStatements, schemaStatements } from "@/lib/db/schema";
import { generateGuests } from "@/data/guests";
import { seedPolls } from "@/data/polls";

// Load TURSO_* variables from .env.local if it exists (Node 20.12+).
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — use the local SQLite file.
}

async function main() {
  const db = getDb();
  const demo = process.argv.includes("--demo");
  console.log(`Seeding ${process.env.TURSO_DATABASE_URL || "file:launchpad.db"}${demo ? " (demo mode)" : ""}`);

  await db.batch([...dropStatements, ...schemaStatements], "write");

  const guests = generateGuests(200);
  await db.batch(
    guests.map((g) => ({
      sql: `INSERT INTO guests (full_name, email, organization, ticket_type, checkin_code)
            VALUES (?, ?, ?, ?, ?)`,
      args: [g.fullName, g.email, g.organization, g.ticketType, g.checkinCode],
    })),
    "write",
  );

  for (const poll of seedPolls) {
    const inserted = await db.execute({
      sql: "INSERT INTO polls (question, status, show_results) VALUES (?, ?, ?)",
      args: [poll.question, poll.status, poll.showResults ? 1 : 0],
    });
    const pollId = Number(inserted.lastInsertRowid);
    await db.batch(
      poll.options.map((label, position) => ({
        sql: "INSERT INTO poll_options (poll_id, label, position) VALUES (?, ?, ?)",
        args: [pollId, label, position],
      })),
      "write",
    );
  }

  if (demo) await addDemoActivity();

  const counts = await db.execute(`SELECT
    (SELECT COUNT(*) FROM guests) AS guests,
    (SELECT COUNT(checked_in_at) FROM guests) AS checked_in,
    (SELECT COUNT(*) FROM polls) AS polls,
    (SELECT COUNT(*) FROM votes) AS votes`);
  console.log("Done:", counts.rows[0]);
  console.log("Sample check-in codes:", guests.slice(0, 3).map((g) => `${g.checkinCode} (${g.fullName})`).join(", "));
}

/** Checks in every third guest and has most of them vote, with a simple deterministic spread. */
async function addDemoActivity() {
  const db = getDb();
  const now = Date.now();
  const allGuests = await db.execute("SELECT id FROM guests WHERE id % 3 = 0");
  await db.batch(
    allGuests.rows.map((row) => ({
      sql: "UPDATE guests SET checked_in_at = ? WHERE id = ?",
      // Spread arrival times over the last hour.
      args: [new Date(now - ((Number(row.id) * 37) % 3600) * 1000).toISOString(), Number(row.id)],
    })),
    "write",
  );

  const options = await db.execute(
    `SELECT o.id, o.poll_id, o.position FROM poll_options o
     JOIN polls p ON p.id = o.poll_id ORDER BY o.poll_id, o.position`,
  );
  const checkedIn = await db.execute("SELECT id FROM guests WHERE checked_in_at IS NOT NULL");
  const pollIds = [...new Set(options.rows.map((o) => Number(o.poll_id)))];

  const votes = [];
  for (const row of checkedIn.rows) {
    const guestId = Number(row.id);
    for (const pollId of pollIds) {
      if ((guestId + pollId) % 4 === 0) continue; // ~25% skip each poll
      const pollOptions = options.rows.filter((o) => Number(o.poll_id) === pollId);
      const option = pollOptions[(Math.floor(guestId / 3) + pollId * Math.floor(guestId / 7)) % pollOptions.length];
      votes.push({
        sql: "INSERT INTO votes (poll_id, option_id, guest_id, created_at) VALUES (?, ?, ?, ?)",
        args: [pollId, Number(option.id), guestId, new Date(now).toISOString()],
      });
    }
  }
  await db.batch(votes, "write");
}

main().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});
