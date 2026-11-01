// SQL that creates the database tables. Run by `npm run db:seed`.
//
// Duplicate protection lives in the database itself:
//  - guests.checkin_code is UNIQUE, so no two guests share a code.
//  - votes has UNIQUE (poll_id, guest_id), so a guest can vote once per poll
//    even if two requests arrive at the same moment.

export const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS guests (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name     TEXT NOT NULL,
    email         TEXT NOT NULL,
    organization  TEXT NOT NULL,
    ticket_type   TEXT NOT NULL,
    checkin_code  TEXT NOT NULL UNIQUE,
    checked_in_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS polls (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    question     TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    show_results INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS poll_options (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    poll_id  INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    label    TEXT NOT NULL,
    position INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS votes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    poll_id    INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    option_id  INTEGER NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
    guest_id   INTEGER NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    UNIQUE (poll_id, guest_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_guests_name ON guests(full_name)`,
  `CREATE INDEX IF NOT EXISTS idx_votes_poll ON votes(poll_id)`,
];

export const dropStatements = [
  "DROP TABLE IF EXISTS votes",
  "DROP TABLE IF EXISTS poll_options",
  "DROP TABLE IF EXISTS polls",
  "DROP TABLE IF EXISTS guests",
];
