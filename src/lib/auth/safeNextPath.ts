// Kept separate from staff.ts because the browser uses it too, and staff.ts
// is server-only (it reads STAFF_PIN).

/** Only allow redirects to paths on this site, never to another domain ("//evil.com"). */
export function safeNextPath(next: string | null | undefined, fallback = "/usher"): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}
