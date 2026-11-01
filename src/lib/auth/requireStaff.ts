import { cookies } from "next/headers";
import { STAFF_COOKIE, isValidStaffToken } from "./staff";

/**
 * Call at the top of every staff-only route handler. Returns a 401 response
 * to send back if the request isn't from a logged-in staff member, or null
 * if it may continue.
 */
export async function requireStaff(): Promise<Response | null> {
  const token = (await cookies()).get(STAFF_COOKIE)?.value;
  if (await isValidStaffToken(token)) return null;
  return Response.json({ error: "Staff login required." }, { status: 401 });
}
