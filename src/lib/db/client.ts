import { createClient, type Client } from "@libsql/client";

// One shared database connection for the whole server.
//
// Locally this is a plain SQLite file (launchpad.db in the project root).
// In production (Vercel) we point TURSO_DATABASE_URL at a hosted Turso
// database, because Vercel's filesystem does not keep files between requests.
// The SQL is identical in both cases.
//
// Only import this from server code (API routes, scripts) — never from a
// "use client" component.

let client: Client | undefined;

export function getDb(): Client {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL || "file:launchpad.db",
      authToken: process.env.TURSO_AUTH_TOKEN || undefined,
    });
  }
  return client;
}
