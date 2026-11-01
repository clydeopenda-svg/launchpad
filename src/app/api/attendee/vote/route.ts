import { readCode, slowDown } from "@/lib/attendee";
import { castVote, type VoteResult } from "@/lib/db/queries";

// castVote does all the checks (guest exists, checked in, poll open, option
// belongs to the poll, one vote per poll); this maps each outcome to an HTTP
// status and a message the attendee can act on.
const outcomes: Record<VoteResult["status"], { status: number; message: string }> = {
  voted: { status: 200, message: "Vote recorded." },
  already_voted: { status: 409, message: "You've already voted in this poll." },
  guest_not_found: { status: 404, message: "We couldn't find that check-in code." },
  not_checked_in: { status: 403, message: "Please check in at the door before voting." },
  poll_closed: { status: 409, message: "This poll has closed." },
  invalid_option: { status: 400, message: "That option isn't part of this poll." },
};

/** POST /api/attendee/vote  { code, pollId, optionId } */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const code = readCode(body);
  const pollId = Number(body?.pollId);
  const optionId = Number(body?.optionId);
  if (!code.trim() || !Number.isInteger(pollId) || !Number.isInteger(optionId)) {
    return Response.json({ error: "code, pollId and optionId are required." }, { status: 400 });
  }

  try {
    const result = await castVote(code, pollId, optionId);
    if (result.status === "guest_not_found") await slowDown();
    const { status, message } = outcomes[result.status];
    return status === 200
      ? Response.json({ result: result.status, message })
      : Response.json({ result: result.status, error: message }, { status });
  } catch (error) {
    console.error("Vote failed:", error);
    return Response.json({ error: "Your vote didn't go through. Please try again." }, { status: 500 });
  }
}
