import { cookies } from "next/headers";
import { STAFF_COOKIE } from "@/lib/auth/staff";

export async function POST() {
  (await cookies()).delete(STAFF_COOKIE);
  return Response.json({ ok: true });
}
