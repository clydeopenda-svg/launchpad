// A simple in-memory, fixed-window rate limiter.
//
// Limitation: memory is per server instance. On Vercel, several instances
// may run at once and each restarts often, so this is a best-effort brake on
// accidental or casual abuse — not a hard guarantee. A shared store (e.g. a
// database table or Redis) would be needed for strict limits.

const windows = new Map<string, { count: number; resetAt: number }>();

/** Returns true if the request is allowed, false if `key` has used up its `limit` for this window. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();

  // Drop expired entries now and then so the map can't grow forever.
  if (windows.size > 5000) {
    for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);
  }

  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count++;
  return true;
}

/** True if `key` has already used up its `limit` this window. Unlike rateLimit(), this doesn't count as an attempt. */
export function isRateLimited(key: string, limit: number): boolean {
  const current = windows.get(key);
  return current !== undefined && current.resetAt > Date.now() && current.count >= limit;
}

/** Best-guess client IP. Behind Vercel's proxy the first x-forwarded-for entry is the visitor. */
export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}
