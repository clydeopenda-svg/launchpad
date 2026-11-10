// Kept separate from staff.ts because the browser uses it too, and staff.ts
// is server-only (it reads STAFF_PIN).

// Never contacted: it only gives the URL parser something to resolve against.
// It must be http(s), because only those schemes treat "\" as "/" like the
// real site does.
const PLACEHOLDER_ORIGIN = "https://launchpad.invalid";

/**
 * Only allow redirects to paths on this site, never to another domain.
 *
 * Inspecting the string isn't enough, because browsers rewrite URLs before
 * following them: "//evil.com" and "/\evil.com" are other sites, and so is
 * "/<tab>/evil.com", since tabs and line breaks are deleted. Resolving with
 * the URL parser applies the same rules the browser will.
 *
 * Returns `next` as given, not the parsed path: normalising "/.//evil.com"
 * would produce "//evil.com" and create the redirect this function prevents.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/usher"): string {
  if (!next?.startsWith("/")) return fallback;
  try {
    return new URL(next, PLACEHOLDER_ORIGIN).origin === PLACEHOLDER_ORIGIN ? next : fallback;
  } catch {
    return fallback; // Unparseable, e.g. "//[" (an invalid host).
  }
}
