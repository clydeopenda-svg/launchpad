// Staff (usher/organizer) access control.
//
// Staff share one PIN (env STAFF_PIN). After a correct PIN we store a session
// token in an httpOnly cookie. The token is "<expiry>.<signature>", where the
// signature is an HMAC of the expiry time keyed by the PIN, so:
//  - the PIN itself is never stored in the browser;
//  - the token can be checked without a database or session store;
//  - changing STAFF_PIN instantly logs every staff device out;
//  - a copied cookie stops working after STAFF_SESSION_SECONDS, even though
//    the browser would otherwise be the only thing enforcing the cookie's age.
//
// Uses the Web Crypto API so the same code runs in proxy.ts and route handlers.

export const STAFF_COOKIE = "launchpad_staff";

/** How long a staff login lasts: long enough to cover a full event day. */
export const STAFF_SESSION_SECONDS = 60 * 60 * 16;

const SESSION_MESSAGE = "launchpad-staff-session-v2";

function getPin(): string | null {
  const pin = process.env.STAFF_PIN?.trim();
  return pin ? pin : null;
}

export function isStaffPinConfigured(): boolean {
  return getPin() !== null;
}

async function hmac(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
  return Buffer.from(signature).toString("base64url");
}

/** Constant-time string comparison, so response timing doesn't leak how much of a value matched. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Returns the session token for a correct PIN, or null if the PIN is wrong or not configured. */
export async function createStaffToken(pin: string): Promise<string | null> {
  const expected = getPin();
  if (!expected) return null;
  // Compare HMACs rather than the raw strings so both sides have equal length.
  const [given, actual] = await Promise.all([hmac(SESSION_MESSAGE, pin.trim()), hmac(SESSION_MESSAGE, expected)]);
  if (!safeEqual(given, actual)) return null;
  const expiresAt = Math.floor(Date.now() / 1000) + STAFF_SESSION_SECONDS;
  return `${expiresAt}.${await hmac(expected, `${SESSION_MESSAGE}:${expiresAt}`)}`;
}

export async function isValidStaffToken(token: string | undefined): Promise<boolean> {
  const pin = getPin();
  if (!pin || !token) return false;
  const [expiry, signature] = token.split(".");
  const expiresAt = Number(expiry);
  if (!signature || !Number.isInteger(expiresAt) || expiresAt <= Date.now() / 1000) return false;
  // The expiry is covered by the signature, so it can't be pushed back by editing the cookie.
  return safeEqual(signature, await hmac(pin, `${SESSION_MESSAGE}:${expiresAt}`));
}
