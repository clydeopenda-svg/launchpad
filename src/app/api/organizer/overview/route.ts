import { requireStaff } from "@/lib/auth/requireStaff";
import { countDistinctVoters, getAttendanceStats, getPolls, getRecentCheckIns } from "@/lib/db/queries";
import { percent } from "@/lib/utils";

/**
 * GET /api/organizer/overview — everything the organizer dashboard shows,
 * in one request so each 5-second refresh is a single round trip.
 * Unlike the attendee view, this includes counts for hidden-result polls.
 */
export async function GET() {
  const denied = await requireStaff();
  if (denied) return denied;

  try {
    const [stats, polls, voters, recentCheckIns] = await Promise.all([
      getAttendanceStats(),
      getPolls(),
      countDistinctVoters(),
      getRecentCheckIns(10),
    ]);
    return Response.json({
      stats,
      voters,
      // Share of checked-in guests who have voted at least once.
      participationPercent: percent(voters, stats.checkedIn),
      polls,
      recentCheckIns: recentCheckIns.map((g) => ({
        id: g.id,
        fullName: g.fullName,
        organization: g.organization,
        ticketType: g.ticketType,
        checkedInAt: g.checkedInAt,
      })),
    });
  } catch (error) {
    console.error("Loading organizer overview failed:", error);
    return Response.json({ error: "Couldn't load the dashboard. Please try again." }, { status: 500 });
  }
}
