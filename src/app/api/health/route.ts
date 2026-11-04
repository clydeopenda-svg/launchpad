import { connection } from "next/server";
import { getDb } from "@/lib/db/client";

/**
 * GET /api/health — a quick check that the app is up and can reach its
 * database, for uptime monitors and for confirming a Vercel deploy is wired
 * to Turso correctly. Reports only whether each piece is configured, never
 * the values, so it is safe to leave public.
 */
export async function GET() {
  // Must run per request: a health check prerendered at build time would
  // always report the build machine's state.
  await connection();

  const config = {
    geminiKey: Boolean(process.env.GEMINI_API_KEY),
    staffPin: Boolean(process.env.STAFF_PIN?.trim()),
    // A "file:" URL is still a local SQLite file, not a hosted Turso database.
    hostedDatabase: Boolean(process.env.TURSO_DATABASE_URL && !process.env.TURSO_DATABASE_URL.startsWith("file:")),
  };

  try {
    await getDb().execute("SELECT 1");
    return Response.json({ status: "ok", database: "ok", config }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Health check: database unreachable:", error);
    return Response.json(
      { status: "error", database: "unreachable", config },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
