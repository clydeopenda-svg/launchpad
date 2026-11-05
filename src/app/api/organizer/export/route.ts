import { requireStaff } from "@/lib/auth/requireStaff";
import { getAllGuests } from "@/lib/db/queries";
import { toCsv } from "@/lib/utils";

/**
 * GET /api/organizer/export — the full guest list with check-in times as a
 * CSV download, for post-event reporting or a spreadsheet backup. Check-in
 * codes are left out: they are attendees' voting credentials and aren't
 * needed for reporting.
 */
export async function GET() {
  const denied = await requireStaff();
  if (denied) return denied;

  try {
    const guests = await getAllGuests();
    const csv = toCsv([
      ["Name", "Email", "Organization", "Ticket type", "Checked in", "Checked in at (UTC)"],
      ...guests.map((g) => [
        g.fullName,
        g.email,
        g.organization,
        g.ticketType,
        g.checkedInAt ? "Yes" : "No",
        g.checkedInAt,
      ]),
    ]);
    const date = new Date().toISOString().slice(0, 10);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="launchpad-guests-${date}.csv"`,
        // Contains guest emails: never keep it in a shared cache.
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Guest export failed:", error);
    return Response.json({ error: "Couldn't export guests. Please try again." }, { status: 500 });
  }
}
