import type { NextRequest } from "next/server";
import { requireStaff } from "@/lib/auth/requireStaff";
import { updatePoll } from "@/lib/db/queries";

/**
 * PATCH /api/organizer/polls/:id  { status?: "open" | "closed", showResults?: boolean }
 *
 * Attendee screens pick up the change on their next 5-second refresh.
 */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/organizer/polls/[id]">) {
  const denied = await requireStaff();
  if (denied) return denied;

  const id = Number((await ctx.params).id);
  const body = await request.json().catch(() => null);
  const status = body?.status;
  const showResults = body?.showResults;

  // Validate strictly: these values go straight into the database.
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: "Invalid poll id." }, { status: 400 });
  }
  if (status !== undefined && status !== "open" && status !== "closed") {
    return Response.json({ error: 'status must be "open" or "closed".' }, { status: 400 });
  }
  if (showResults !== undefined && typeof showResults !== "boolean") {
    return Response.json({ error: "showResults must be true or false." }, { status: 400 });
  }
  if (status === undefined && showResults === undefined) {
    return Response.json({ error: "Nothing to update." }, { status: 400 });
  }

  try {
    const found = await updatePoll(id, { status, showResults });
    if (!found) return Response.json({ error: "Poll not found." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Updating poll failed:", error);
    return Response.json({ error: "Couldn't update the poll. Please try again." }, { status: 500 });
  }
}
