import { getPolls, getVotesForGuest } from "@/lib/db/queries";
import { clientIp, isRateLimited, rateLimit } from "@/lib/rateLimit";
import type { AttendeePoll, Guest, Poll } from "@/types";

// Shared by the attendee API routes: looks up a guest by check-in code and
// builds the poll list as that guest is allowed to see it.

/** Delay for unknown codes, which makes guessing valid codes by brute force slow. */
async function slowDown() {
  await new Promise((resolve) => setTimeout(resolve, 600));
}

// Only *unknown* codes count towards this limit, so the 5-second refresh of a
// valid code never trips it. It is per IP, and many attendees may share the
// venue Wi-Fi's IP, so it is set high enough to absorb plenty of typos while
// still stopping anyone from walking through the code space.
const FAILED_CODE_LIMIT = 30;
const FAILED_CODE_WINDOW_MS = 5 * 60 * 1000;

function failedCodeKey(request: Request) {
  return `attendee-code:${clientIp(request)}`;
}

/** A 429 response if this visitor has tried too many unknown codes, otherwise null. Check before looking a code up. */
export function tooManyFailedCodes(request: Request): Response | null {
  if (!isRateLimited(failedCodeKey(request), FAILED_CODE_LIMIT)) return null;
  return Response.json(
    { error: "Too many incorrect codes. Please wait a few minutes, or ask at the check-in desk." },
    { status: 429, headers: { "Retry-After": String(FAILED_CODE_WINDOW_MS / 1000) } },
  );
}

/** Counts an unknown code against this visitor and applies the guessing delay. */
export async function recordFailedCode(request: Request) {
  rateLimit(failedCodeKey(request), FAILED_CODE_LIMIT, FAILED_CODE_WINDOW_MS);
  await slowDown();
}

export function readCode(body: unknown): string {
  const code = (body as { code?: unknown } | null)?.code;
  return typeof code === "string" ? code : "";
}

/**
 * Results are shown only after the guest has voted (or the poll has closed),
 * so live percentages don't sway undecided voters. Polls with show_results
 * off stay hidden for everyone until the organizer turns them on.
 *
 * Kept free of database calls so this rule can be unit-tested directly.
 */
export function toAttendeePoll(poll: Poll, myOptionId: number | null): AttendeePoll {
  const resultsVisible = poll.showResults && (myOptionId !== null || poll.status === "closed");
  return {
    id: poll.id,
    question: poll.question,
    status: poll.status,
    myOptionId,
    resultsVisible,
    // Strip the counts entirely rather than hiding them in the UI.
    options: poll.options.map((o) => (resultsVisible ? o : { id: o.id, label: o.label })),
    totalVotes: resultsVisible ? poll.totalVotes : undefined,
  };
}

export async function getPollsForGuest(guest: Guest): Promise<AttendeePoll[]> {
  const [polls, myVotes] = await Promise.all([getPolls(), getVotesForGuest(guest.id)]);
  return polls.map((poll) => toAttendeePoll(poll, myVotes[poll.id] ?? null));
}

/** Only what the attendee screen needs — no email or organization. */
export function publicGuest(guest: Guest) {
  return { firstName: guest.fullName.split(" ")[0], checkedIn: guest.checkedInAt !== null };
}
