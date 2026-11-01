import { requireStaff } from "@/lib/auth/requireStaff";
import { checkInGuest } from "@/lib/db/queries";

/**
 * POST /api/usher/checkin  { guestId }
 *
 * "already_checked_in" is returned as a normal 200 result rather than an
 * error: it's an expected situation at a busy door (another usher got there
 * first), and the UI shows it as a warning with the original arrival time.
 */
export async function POST(request: Request) {
  const denied = await requireStaff();
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const guestId = Number(body?.guestId);
  if (!Number.isInteger(guestId) || guestId <= 0) {
    return Response.json({ error: "A valid guestId is required." }, { status: 400 });
  }

  try {
    const result = await checkInGuest(guestId);
    if (result.status === "not_found") {
      return Response.json({ error: "Guest not found." }, { status: 404 });
    }
    return Response.json(result);
  } catch (error) {
    console.error("Check-in failed:", error);
    return Response.json({ error: "Check-in failed. Please try again." }, { status: 500 });
  }
}
