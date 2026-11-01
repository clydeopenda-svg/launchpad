import { NextResponse, type NextRequest } from "next/server";
import { STAFF_COOKIE, isValidStaffToken } from "@/lib/auth/staff";

// Runs before staff-only routes render. Pages without a valid staff cookie are
// redirected to the PIN screen; API calls get a 401 instead, since a redirect
// to an HTML page is useless to fetch().
//
// This is the first line of defence only — the staff API routes check the
// cookie again themselves (see requireStaff), so they stay protected even if
// this matcher is changed.
export async function proxy(request: NextRequest) {
  if (await isValidStaffToken(request.cookies.get(STAFF_COOKIE)?.value)) {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Staff login required." }, { status: 401 });
  }

  const loginUrl = new URL("/staff/login", request.url);
  loginUrl.searchParams.set("next", pathname + search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/usher/:path*", "/organizer/:path*", "/api/usher/:path*", "/api/organizer/:path*"],
};
