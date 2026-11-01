import type { NextRequest } from "next/server";
import { requireStaff } from "@/lib/auth/requireStaff";
import { getAttendanceStats, searchGuests } from "@/lib/db/queries";

// Cap the list sent to the browser; ushers narrow it down by searching.
const MAX_RESULTS = 50;

/** GET /api/usher/guests?q=... — matching guests plus live attendance numbers. */
export async function GET(request: NextRequest) {
  const denied = await requireStaff();
  if (denied) return denied;

  const query = request.nextUrl.searchParams.get("q") ?? "";
  try {
    const [guests, stats] = await Promise.all([searchGuests(query), getAttendanceStats()]);
    return Response.json({
      guests: guests.slice(0, MAX_RESULTS),
      totalMatches: guests.length,
      stats,
    });
  } catch (error) {
    console.error("Guest search failed:", error);
    return Response.json({ error: "Couldn't load guests. Please try again." }, { status: 500 });
  }
}
