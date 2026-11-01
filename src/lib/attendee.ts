import { getPolls, getVotesForGuest } from "@/lib/db/queries";
import type { AttendeePoll, Guest } from "@/types";

// Shared by the attendee API routes: looks up a guest by check-in code and
// builds the poll list as that guest is allowed to see it.

/** Delay for unknown codes, which makes guessing valid codes by brute force slow. */
export async function slowDown() {
  await new Promise((resolve) => setTimeout(resolve, 600));
}

export function readCode(body: unknown): string {
  const code = (body as { code?: unknown } | null)?.code;
  return typeof code === "string" ? code : "";
}

/**
 * Results are shown only after the guest has voted (or the poll has closed),
 * so live percentages don't sway undecided voters. Polls with show_results
 * off stay hidden for everyone until the organizer turns them on.
 */
export async function getPollsForGuest(guest: Guest): Promise<AttendeePoll[]> {
  const [polls, myVotes] = await Promise.all([getPolls(), getVotesForGuest(guest.id)]);

  return polls.map((poll) => {
    const myOptionId = myVotes[poll.id] ?? null;
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
  });
}

/** Only what the attendee screen needs — no email or organization. */
export function publicGuest(guest: Guest) {
  return { firstName: guest.fullName.split(" ")[0], checkedIn: guest.checkedInAt !== null };
}
