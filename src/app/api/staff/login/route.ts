import { cookies } from "next/headers";
import { STAFF_COOKIE, STAFF_SESSION_SECONDS, createStaffToken, isStaffPinConfigured } from "@/lib/auth/staff";

export async function POST(request: Request) {
  if (!isStaffPinConfigured()) {
    // Fail closed: without a PIN set, nobody gets staff access.
    return Response.json({ error: "Staff PIN is not configured on the server." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const pin = typeof body?.pin === "string" ? body.pin : "";
  const token = await createStaffToken(pin);

  if (!token) {
    // A short delay makes guessing a short PIN by brute force much slower.
    await new Promise((resolve) => setTimeout(resolve, 600));
    return Response.json({ error: "Incorrect PIN." }, { status: 401 });
  }

  (await cookies()).set(STAFF_COOKIE, token, {
    httpOnly: true, // not readable from JavaScript
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: STAFF_SESSION_SECONDS,
  });
  return Response.json({ ok: true });
}
