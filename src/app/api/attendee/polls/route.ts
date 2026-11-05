import { getPollsForGuest, publicGuest, readCode, recordFailedCode, tooManyFailedCodes } from "@/lib/attendee";
import { getGuestByCode } from "@/lib/db/queries";

/**
 * POST /api/attendee/polls  { code }
 *
 * POST rather than GET so the check-in code (the attendee's only credential)
 * travels in the request body and doesn't end up in URLs, logs or history.
 */
export async function POST(request: Request) {
  const blocked = tooManyFailedCodes(request);
  if (blocked) return blocked;

  const code = readCode(await request.json().catch(() => null));
  if (!code.trim()) {
    return Response.json({ error: "Enter your check-in code." }, { status: 400 });
  }

  try {
    const guest = await getGuestByCode(code);
    if (!guest) {
      await recordFailedCode(request);
      return Response.json({ error: "We couldn't find that check-in code." }, { status: 404 });
    }
    return Response.json({ guest: publicGuest(guest), polls: await getPollsForGuest(guest) });
  } catch (error) {
    console.error("Loading attendee polls failed:", error);
    return Response.json({ error: "Couldn't load polls. Please try again." }, { status: 500 });
  }
}
